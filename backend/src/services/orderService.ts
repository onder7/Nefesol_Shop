import { prisma } from '../config/database';
import { getShippingConfig, computeShipping, getTaxConfig } from './settingsService';
import { logger } from '../config/logger';
import * as emailSvc from './emailService';

export { computeShipping };

// Bu eşik veya altına düşen stoklarda yöneticiye uyarı gönderilir
const LOW_STOCK_THRESHOLD = 5;

const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              category: { select: { name: true } },
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      },
    },
  },
} as const;

export async function getCartForCheckout(userId: string) {
  const cart = await prisma.cart.findFirst({ where: { userId }, include: CART_INCLUDE });
  if (!cart || cart.items.length === 0) {
    throw Object.assign(new Error('Sepet boş'), { status: 400 });
  }
  return cart;
}

export async function createOrder(userId: string, addressId: string) {
  const cart = await getCartForCheckout(userId);

  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw Object.assign(new Error('Adres bulunamadı'), { status: 404 });

  // Stock validation
  for (const item of cart.items) {
    if (item.variant.stockQty < item.quantity) {
      throw Object.assign(
        new Error(`"${item.variant.product.name}" için yeterli stok kalmadı`),
        { status: 400 },
      );
    }
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.priceAtAdd) * item.quantity,
    0,
  );
  const config = await getShippingConfig();
  const shippingFee = computeShipping(subtotal, config);

  // Fiyatlar KDV hariç (net). İndirim net tutara uygulanır, KDV indirim sonrası net üzerinden hesaplanır.
  const { taxRate } = await getTaxConfig();
  const discount = 0;
  const taxableBase = subtotal - discount;
  const tax = Math.round(taxableBase * taxRate) / 100;
  const total = taxableBase + tax + shippingFee;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: { userId, addressId, subtotal, shippingFee, discount, total, status: 'PENDING' },
    });

    for (const item of cart.items) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.priceAtAdd,
        },
      });

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }

    await tx.orderStatusLog.create({
      data: { orderId: newOrder.id, status: 'PENDING', note: 'Sipariş oluşturuldu' },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  // Return full order with items for email
  const fullOrder = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true, slug: true } } },
          },
        },
      },
      address: true,
      user: { select: { firstName: true } },
    },
  });

  // ─── Yönetici uyarıları (sipariş akışını bloklamaz / hata yutulur) ───
  void (async () => {
    try {
      // Yeni sipariş bildirimi
      await emailSvc.notifyAdminNewOrder({
        orderId: fullOrder.id,
        customerName: fullOrder.user?.firstName || fullOrder.address.firstName || '',
        total: Number(fullOrder.total),
        itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      });

      // Düşük stok bildirimi — siparişle eşiğe düşen / tükenen ürünler
      const lowItems = cart.items
        .map((item) => {
          const oldStock = item.variant.stockQty;
          const newStock = oldStock - item.quantity;
          return { item, oldStock, newStock };
        })
        .filter(({ oldStock, newStock }) =>
          (oldStock > LOW_STOCK_THRESHOLD && newStock <= LOW_STOCK_THRESHOLD) || (oldStock > 0 && newStock <= 0),
        )
        .map(({ item, newStock }) => ({
          name: item.variant.product.name,
          sku: item.variant.sku ?? '',
          stock: Math.max(0, newStock),
        }));

      await emailSvc.notifyAdminLowStock(lowItems);
    } catch (e) {
      logger.error('Yönetici uyarı e-postası gönderilemedi', { orderId: fullOrder.id, error: (e as Error)?.message });
    }
  })();

  return fullOrder;
}

export async function listOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          variant: { include: { product: { select: { name: true, slug: true, images: true } } } },
        },
      },
      shipping: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderDetail(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  name: true,
                  slug: true,
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
        },
      },
      address: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payment: true,
      shipping: true,
    },
  });

  if (!order) throw Object.assign(new Error('Sipariş bulunamadı'), { status: 404 });

  return {
    ...order,
    paymentMethod: order.payment?.provider || undefined,
    paymentId: order.payment?.transactionId || undefined,
  };
}
