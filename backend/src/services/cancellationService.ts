import { prisma } from '../config/database';
import { CancellationReason, CancellationStatus, OrderStatus } from '@prisma/client';
import { getTaxConfig } from './settingsService';

const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  CHANGED_MIND: 'Siparişten Vazgeçtim',
  DELIVERY_TIME_LONG: 'Teslimat Süresi Çok Uzun',
  BETTER_PRICE_FOUND: 'Başka Platformda Daha Uygun Fiyat Buldum',
  PRODUCT_INFO_ERROR: 'Ürün Bilgilerinde Hata/Eksiklik',
  OTHER: 'Diğer',
};

export async function requestCancellation(
  orderId: string,
  userId: string,
  reason: CancellationReason,
  description?: string
) {
  // Verify order belongs to user
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { variant: true } }, user: true },
  });

  if (!order) throw new Error('Sipariş bulunamadı');
  if (order.userId !== userId) throw new Error('Bu siparişe erişim yetkiniz yok');

  // Check if already has a cancellation request
  const existing = await prisma.orderCancellation.findUnique({
    where: { orderId },
  });

  if (existing) {
    if (existing.status === 'REQUESTED') throw new Error('Zaten bir iptal talebiniz var');
    if (existing.status === 'APPROVED') throw new Error('Siparişiniz zaten iptal edildi');
    if (existing.status === 'REFUNDED') throw new Error('İadeniz zaten işlendi');
  }

  // Check if order can be cancelled
  if (order.status === 'REFUNDED') throw new Error('Bu sipariş zaten iade edilmiş');
  if (order.status === 'CANCELLED') throw new Error('Bu sipariş zaten iptal edilmiş');

  // Create cancellation request
  const cancellation = await prisma.orderCancellation.create({
    data: {
      orderId,
      reason,
      description,
      status: 'REQUESTED',
      refundAmount: order.total,
    },
  });

  // TODO: Send email notification when emailService sendMail is exported
  // Email type: İptal Talebi Alındı

  return cancellation;
}

export async function approveCancellation(
  cancellationId: string,
  adminNotes?: string,
  couponOffered?: boolean,
  couponCode?: string,
  couponValue?: number
) {
  const cancellation = await prisma.orderCancellation.findUnique({
    where: { id: cancellationId },
    include: { order: { include: { items: { include: { variant: true } }, user: true } } },
  });

  if (!cancellation) throw new Error('İptal talebi bulunamadı');
  if (cancellation.status !== 'REQUESTED') throw new Error('Bu talep zaten işlendi');

  // Update cancellation
  const updated = await prisma.orderCancellation.update({
    where: { id: cancellationId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      adminNotes,
      couponOffered: couponOffered || false,
      couponCode: couponOffered ? couponCode : null,
      couponValue: couponOffered ? couponValue : null,
    },
  });

  // Update order status
  await prisma.order.update({
    where: { id: cancellation.orderId },
    data: { status: 'CANCELLED' },
  });

  // Add status log
  const logNote = couponOffered
    ? `İptal Onaylandı - Kupon Teklifi: ${couponCode} (${couponValue} TRY)`
    : `İptal Onaylandı${adminNotes ? ': ' + adminNotes : ''}`;

  await prisma.orderStatusLog.create({
    data: {
      orderId: cancellation.orderId,
      status: 'CANCELLED',
      note: logNote,
    },
  });

  // Restore stock for all items
  for (const item of cancellation.order.items) {
    await prisma.productVariant.update({
      where: { id: item.variantId },
      data: { stockQty: { increment: item.quantity } },
    });
  }

  // TODO: Send approval email when emailService sendMail is exported
  // Email type: İptal Onaylandı (with coupon info if applicable)

  return updated;
}

export async function rejectCancellation(cancellationId: string, reason?: string) {
  const cancellation = await prisma.orderCancellation.findUnique({
    where: { id: cancellationId },
    include: { order: { include: { user: true } } },
  });

  if (!cancellation) throw new Error('İptal talebi bulunamadı');
  if (cancellation.status !== 'REQUESTED') throw new Error('Bu talep zaten işlendi');

  const updated = await prisma.orderCancellation.update({
    where: { id: cancellationId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      adminNotes: reason,
    },
  });

  // TODO: Send rejection email when emailService sendMail is exported
  // Email type: İptal Reddedildi

  return updated;
}

export async function processRefund(cancellationId: string) {
  const cancellation = await prisma.orderCancellation.findUnique({
    where: { id: cancellationId },
    include: { order: { include: { user: true } } },
  });

  if (!cancellation) throw new Error('İptal talebi bulunamadı');
  if (cancellation.status !== 'APPROVED') throw new Error('İptal onaylanmamış');

  // In real scenario, process with payment gateway here
  // For now, just mark as refunded

  const updated = await prisma.orderCancellation.update({
    where: { id: cancellationId },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
    },
  });

  // Update order status
  await prisma.order.update({
    where: { id: cancellation.orderId },
    data: { status: 'REFUNDED' },
  });

  // Add status log
  await prisma.orderStatusLog.create({
    data: {
      orderId: cancellation.orderId,
      status: 'REFUNDED',
      note: `İade Geri Yollandı: ${cancellation.refundAmount} TRY`,
    },
  });

  // TODO: Send refund email when emailService sendMail is exported
  // Email type: İade Tamamlandı

  return updated;
}

export async function getCancellation(cancellationId: string, userId?: string) {
  const cancellation = await prisma.orderCancellation.findUnique({
    where: { id: cancellationId },
    include: { order: userId ? { select: { userId: true } } : false },
  });

  if (!cancellation) throw new Error('İptal talebi bulunamadı');

  // Check permission if userId provided
  if (userId && cancellation.order?.userId !== userId) {
    throw new Error('Bu talebe erişim yetkiniz yok');
  }

  return cancellation;
}

export async function listCancellations(filters?: {
  status?: CancellationStatus;
  limit?: number;
  offset?: number;
}) {
  return prisma.orderCancellation.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      order: {
        select: {
          id: true,
          total: true,
          createdAt: true,
          user: { select: { email: true, id: true, profile: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
    orderBy: { requestedAt: 'desc' },
    take: filters?.limit || 50,
    skip: filters?.offset || 0,
  });
}

export async function getOrderCancellation(orderId: string) {
  return prisma.orderCancellation.findUnique({
    where: { orderId },
  });
}

// Kullanıcının kazandığı tüm kuponları döndürür (iptalden vazgeçip kupon kabul edenler)
export async function getUserCoupons(userId: string) {
  const cancellations = await prisma.orderCancellation.findMany({
    where: {
      status: 'REFUNDED',
      couponCode: { not: null },
      order: { userId },
    },
    include: {
      order: { select: { id: true, createdAt: true } },
    },
    orderBy: { refundedAt: 'desc' },
  });

  return cancellations.map((c) => ({
    code: c.couponCode,
    value: c.couponValue ? Number(c.couponValue) : 0,
    orderId: c.orderId,
    appliedAt: c.refundedAt || c.order.createdAt,
  }));
}

export async function unrejectCancellation(cancellationId: string) {
  const cancellation = await prisma.orderCancellation.findUnique({
    where: { id: cancellationId },
  });

  if (!cancellation) throw new Error('İptal talebi bulunamadı');
  if (cancellation.status !== 'REJECTED') throw new Error('Sadece reddedilen talepler iptal edilebilir');

  // Delete the cancellation so customer can request again
  await prisma.orderCancellation.delete({
    where: { id: cancellationId },
  });
}

export async function withdrawCancellation(orderId: string, userId: string) {
  // Find and verify cancellation belongs to user
  const cancellation = await prisma.orderCancellation.findUnique({
    where: { orderId },
    include: { order: { include: { payment: true, items: { include: { variant: true } } } } },
  });

  if (!cancellation) throw new Error('İptal talebi bulunamadı');
  if (cancellation.order.userId !== userId) throw new Error('Bu talebe erişim yetkiniz yok');
  if (cancellation.status !== 'APPROVED') throw new Error('Sadece onaylı talepleri geri alabilirsiniz');
  if (!cancellation.couponCode) throw new Error('Kupon teklifi olmayan talepler geri alınamaz');

  const order = cancellation.order;
  const couponAmount = Number(cancellation.couponValue) || 0;
  const newDiscount = Number(order.discount) + couponAmount;

  // İndirim KDV hariç (net) tutara uygulanır, KDV indirim sonrası net üzerinden yeniden hesaplanır.
  const { taxRate } = await getTaxConfig();
  const taxableBase = Number(order.subtotal) - newDiscount;
  const tax = Math.round(taxableBase * taxRate) / 100;
  const newTotal = taxableBase + tax + Number(order.shippingFee);

  // Kuponu kabul etmek = siparişi iptal etmekten vazgeçmek.
  // Sipariş ÖDENMİŞSE doğrudan hazırlığa (PROCESSING), ÖDENMEMİŞSE (havale/kapıda) ödeme bekler (PENDING).
  const isPaid = order.payment?.status === 'SUCCESS';
  const reinstateStatus = isPaid ? 'PROCESSING' : 'PENDING';

  await prisma.order.update({
    where: { id: orderId },
    data: {
      discount: newDiscount,
      total: newTotal,
      status: reinstateStatus,
    },
  });

  // Update cancellation as completed (coupon offered)
  await prisma.orderCancellation.update({
    where: { id: cancellation.id },
    data: { status: 'REFUNDED', refundedAt: new Date() },
  });

  // Add status log
  await prisma.orderStatusLog.create({
    data: {
      orderId,
      status: reinstateStatus,
      note: `İndirim teklifi kabul edildi (−${couponAmount} TRY). ${isPaid ? 'Sipariş hazırlığa alındı.' : 'Sipariş ödeme bekliyor.'}`,
    },
  });

  // İptal ONAYINDA stok geri yüklenmişti (approveCancellation). Sipariş yeniden aktifleştiği
  // için stoğu TEKRAR düş — aksi halde sipariş kargolanır ama stok azalmaz.
  for (const item of order.items) {
    const variant = await prisma.productVariant.update({
      where: { id: item.variantId },
      data: { stockQty: { decrement: item.quantity } },
      select: { stockQty: true },
    });
    await prisma.stockMovement.create({
      data: {
        variantId: item.variantId,
        oldQty: variant.stockQty + item.quantity,
        newQty: variant.stockQty,
        difference: -item.quantity,
        reason: 'cancellation_withdrawn',
        note: 'İptalden vazgeçildi (indirim kabul) — stok yeniden düşüldü',
      },
    });
  }

  return { reinstateStatus, isPaid, newTotal };
}
