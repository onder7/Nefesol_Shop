import { prisma } from '../config/database';
import { AppError } from '../types';
import { Prisma } from '@prisma/client';
import {
  getUmamiConfig,
  fetchStats,
  fetchMetrics,
  UmamiMetric,
} from './umamiService';

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf30Days = new Date(now);
  startOf30Days.setDate(now.getDate() - 30);

  const [
    totalOrders,
    todayOrders,
    totalRevenue,
    monthRevenue,
    totalCustomers,
    newCustomers,
    totalProducts,
    pendingOrders,
    recentOrders,
    salesByDay,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ['CANCELLED', 'REFUNDED'] }, createdAt: { gte: startOf30Days } },
    }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startOf30Days } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        items: { select: { quantity: true, unitPrice: true } },
      },
    }),
    // Son 30 günün günlük satışları
    prisma.$queryRaw<{ day: Date; revenue: number; count: number }[]>`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        SUM(total)::float AS revenue,
        COUNT(*)::int AS count
      FROM orders
      WHERE created_at >= ${startOf30Days}
        AND status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY day
      ORDER BY day ASC
    `,
  ]);

  return {
    totalOrders,
    todayOrders,
    totalRevenue: Number(totalRevenue._sum.total ?? 0),
    monthRevenue: Number(monthRevenue._sum.total ?? 0),
    totalCustomers,
    newCustomers,
    totalProducts,
    pendingOrders,
    recentOrders,
    salesByDay: salesByDay.map((r) => ({
      day: r.day,
      revenue: Number(r.revenue),
      count: Number(r.count),
    })),
  };
}

// ─── Admin Ürün Yönetimi ──────────────────────────────────────────────────────

export interface AdminProductInput {
  categoryId: string;
  brandId?: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  vatRate?: number;
  vatIncluded?: boolean;
  variants: {
    id?: string;
    sku: string;
    price: number;
    compareAt?: number;
    stockQty: number;
    desi?: number;
    attributeValueIds?: string[];
  }[];
  images?: { url: string; altText?: string; isPrimary?: boolean; sortOrder?: number }[];
  tags?: string[];
}

export async function adminListProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
}) {
  const { page = 1, limit = 20, search, categoryId, brandId } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        variants: { select: { id: true, sku: true, price: true, stockQty: true, isActive: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function adminCreateProduct(data: AdminProductInput) {
  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);

  return prisma.product.create({
    data: {
      categoryId: data.categoryId,
      brandId: data.brandId || null,
      name: data.name,
      slug: data.slug,
      description: data.description,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      vatRate: data.vatRate ?? 20,
      vatIncluded: data.vatIncluded ?? true,
      variants: {
        create: data.variants.map((v) => ({
          sku: v.sku,
          price: v.price,
          compareAt: v.compareAt,
          stockQty: v.stockQty,
          desi: v.desi,
          attributeValues: v.attributeValueIds?.length
            ? { create: v.attributeValueIds.map((attributeValueId) => ({ attributeValueId })) }
            : undefined,
        })),
      },
      images: data.images
        ? { create: data.images.map((img, i) => ({ ...img, sortOrder: img.sortOrder ?? i })) }
        : undefined,
      tags: data.tags
        ? { create: data.tags.map((tag) => ({ tag })) }
        : undefined,
    },
    include: {
      variants: { include: { attributeValues: { include: { attributeValue: { include: { attribute: true } } } } } },
      images: true,
      tags: true,
    },
  });
}

export async function adminUpdateProduct(id: string, data: Partial<AdminProductInput>) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Ürün bulunamadı', 404);

  if (data.slug && data.slug !== product.slug) {
    const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  }

  return prisma.$transaction(async (tx) => {
    // Temel alanları güncelle
    await tx.product.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        name: data.name,
        slug: data.slug,
        description: data.description,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        vatRate: data.vatRate,
        vatIncluded: data.vatIncluded,
      },
    });

    // Varyantları güncelle (formdan gelen liste)
    if (data.variants) {
      const incomingIds = data.variants.filter((v) => v.id).map((v) => v.id!);

      // Listede olmayan varyantları bul
      const toRemove = await tx.productVariant.findMany({
        where: { productId: id, id: { notIn: incomingIds } },
        select: { id: true, _count: { select: { orderItems: true } } },
      });

      const canHardDelete = toRemove.filter((v) => v._count.orderItems === 0).map((v) => v.id);
      const mustSoftKeep  = toRemove.filter((v) => v._count.orderItems > 0).map((v) => v.id);

      // SKU kısıtı kalmayacak şekilde tamamen sil (sipariş kaydı olmayan varyantlar)
      if (canHardDelete.length > 0) {
        await tx.variantAttributeValue.deleteMany({ where: { variantId: { in: canHardDelete } } });
        await tx.cartItem.deleteMany({ where: { variantId: { in: canHardDelete } } });
        await tx.wishlistItem.deleteMany({ where: { variantId: { in: canHardDelete } } });
        await tx.productVariant.deleteMany({ where: { id: { in: canHardDelete } } });
      }

      // Sipariş geçmişi olan varyantları sadece pasif et
      if (mustSoftKeep.length > 0) {
        await tx.productVariant.updateMany({
          where: { id: { in: mustSoftKeep } },
          data: { isActive: false },
        });
      }

      // Mevcut varyantları güncelle
      for (const v of data.variants.filter((v) => v.id)) {
        await tx.productVariant.update({
          where: { id: v.id! },
          data: {
            sku: v.sku,
            price: v.price,
            compareAt: v.compareAt ?? null,
            stockQty: v.stockQty,
            desi: v.desi ?? null,
            isActive: true,
          },
        });
        // Junction tablosunu sıfırla ve yeniden oluştur
        if (v.attributeValueIds !== undefined) {
          await tx.variantAttributeValue.deleteMany({ where: { variantId: v.id! } });
          if (v.attributeValueIds.length > 0) {
            await tx.variantAttributeValue.createMany({
              data: v.attributeValueIds.map((attributeValueId) => ({ variantId: v.id!, attributeValueId })),
              skipDuplicates: true,
            });
          }
        }
      }

      // Yeni varyantları oluştur
      for (const v of data.variants.filter((v) => !v.id)) {
        const created = await tx.productVariant.create({
          data: {
            productId: id,
            sku: v.sku,
            price: v.price,
            compareAt: v.compareAt,
            stockQty: v.stockQty,
            desi: v.desi,
          },
        });
        if (v.attributeValueIds?.length) {
          await tx.variantAttributeValue.createMany({
            data: v.attributeValueIds.map((attributeValueId) => ({ variantId: created.id, attributeValueId })),
            skipDuplicates: true,
          });
        }
      }
    }

    // Görselleri yeniden oluştur (liste değiştiyse)
    if (data.images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, i) => ({
            productId: id,
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary ?? false,
            sortOrder: img.sortOrder ?? i,
          })),
        });
      }
    }

    // Etiketleri yeniden oluştur
    if (data.tags !== undefined) {
      await tx.productTag.deleteMany({ where: { productId: id } });
      if (data.tags.length > 0) {
        await tx.productTag.createMany({
          data: data.tags.map((tag) => ({ productId: id, tag })),
        });
      }
    }

    return tx.product.findUnique({
      where: { id },
      include: {
        variants: {
          where: { isActive: true },
          include: { attributeValues: { include: { attributeValue: { include: { attribute: true } } } } },
        },
        images: true,
        tags: true,
      },
    });
  });
}

export async function adminGetProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: { attributeValues: { include: { attributeValue: { include: { attribute: true } } } } },
      },
      images: { orderBy: { sortOrder: 'asc' } },
      tags: true,
    },
  });
  if (!product) throw new AppError('Ürün bulunamadı', 404);
  return product;
}

export async function adminDeleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Ürün bulunamadı', 404);
  await prisma.product.delete({ where: { id } });
}

// ─── Admin Sipariş Yönetimi ───────────────────────────────────────────────────

export async function adminListOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  all?: boolean;
}) {
  const { page = 1, limit = 20, status, search, startDate, endDate, all = false } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status as never;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const include = {
    user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
    items: { select: { quantity: true, unitPrice: true } },
    address: { select: { city: true, district: true } },
    payment: { select: { status: true } },
    shipping: { select: { carrier: true, trackingNumber: true } },
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: all ? 0 : skip,
      take: all ? undefined : limit,
      orderBy: { createdAt: 'desc' },
      include,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: string,
  note?: string
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('Sipariş bulunamadı', 404);

  const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
  if (!validStatuses.includes(status)) throw new AppError('Geçersiz durum', 400);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: status as never },
    });
    await tx.orderStatusLog.create({
      data: { orderId, status: status as never, note },
    });
    if (status === 'SHIPPED') {
      await tx.shipping.upsert({
        where: { orderId },
        update: {},
        create: { orderId, status: 'SHIPPED' },
      });
    }
    return updated;
  });
}

export async function adminUpdateOrderShipping(
  orderId: string,
  data: { carrier?: string; trackingNumber?: string }
) {
  const existing = await prisma.shipping.findUnique({ where: { orderId } });
  if (!existing) throw new AppError('Kargo kaydı bulunamadı. Önce siparişi "Kargoda" durumuna alın.', 404);

  return prisma.shipping.update({
    where: { orderId },
    data: {
      carrier: data.carrier ?? existing.carrier,
      trackingNumber: data.trackingNumber ?? existing.trackingNumber,
    },
  });
}

export async function adminGetOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, phone: true } } } },
      address: true,
      items: {
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
            },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payment: true,
      shipping: true,
    },
  });
  if (!order) throw new AppError('Sipariş bulunamadı', 404);
  return order;
}

// ─── Admin Müşteri Yönetimi ───────────────────────────────────────────────────

export async function adminListCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const { page = 1, limit = 20, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = { role: 'CUSTOMER' };
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { profile: { firstName: { contains: search, mode: 'insensitive' } } },
      { profile: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, phone: true } },
        _count: { select: { orders: true } },
        orders: {
          select: { total: true },
          where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    customers: customers.map((c) => ({
      ...c,
      totalSpent: c.orders.reduce((sum, o) => sum + Number(o.total), 0),
      orders: undefined,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function adminToggleCustomerStatus(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, isActive: true },
  });
}

// ─── Admin Kategori/Marka Yönetimi ────────────────────────────────────────────

export async function adminListCategories() {
  return prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    include: {
      _count: { select: { products: true } },
      children: { select: { id: true, name: true, slug: true } },
    },
  });
}

export interface AdminCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function adminCreateCategory(data: AdminCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  return prisma.category.create({ data: { ...data, sortOrder: data.sortOrder ?? 0 } });
}

export async function adminUpdateCategory(id: string, data: Partial<AdminCategoryInput>) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError('Kategori bulunamadı', 404);
  if (data.slug && data.slug !== category.slug) {
    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  }
  return prisma.category.update({ where: { id }, data });
}

export async function adminDeleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) throw new AppError('Kategori bulunamadı', 404);
  if (category._count.products > 0)
    throw new AppError(`Bu kategoriye bağlı ${category._count.products} ürün var. Önce ürünleri taşıyın.`, 409);
  if (category._count.children > 0)
    throw new AppError(`Bu kategorinin ${category._count.children} alt kategorisi var. Önce alt kategorileri silin.`, 409);
  await prisma.category.delete({ where: { id } });
}

export async function adminListBrands() {
  return prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

export interface AdminBrandInput {
  name: string;
  slug: string;
  logoUrl?: string;
  isActive?: boolean;
}

export async function adminCreateBrand(data: AdminBrandInput) {
  const existing = await prisma.brand.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  return prisma.brand.create({ data });
}

export async function adminUpdateBrand(id: string, data: Partial<AdminBrandInput>) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) throw new AppError('Marka bulunamadı', 404);
  if (data.slug && data.slug !== brand.slug) {
    const existing = await prisma.brand.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  }
  return prisma.brand.update({ where: { id }, data });
}

export async function adminDeleteBrand(id: string) {
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw new AppError('Marka bulunamadı', 404);
  if (brand._count.products > 0)
    throw new AppError(`Bu markaya bağlı ${brand._count.products} ürün var. Önce ürünleri başka markaya taşıyın.`, 409);
  await prisma.brand.delete({ where: { id } });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalyticsData(params: { range?: string }) {
  const { range = '30d' } = params;
  const now = new Date();

  let startDate: Date;
  let prevStartDate: Date;

  switch (range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStartDate = new Date(startDate.getTime() - 86400000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 86400000);
      prevStartDate = new Date(now.getTime() - 14 * 86400000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 86400000);
      prevStartDate = new Date(now.getTime() - 180 * 86400000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 86400000);
      prevStartDate = new Date(now.getTime() - 60 * 86400000);
  }

  const excludeFilter: Prisma.OrderWhereInput = {
    status: { notIn: ['CANCELLED', 'REFUNDED'] },
  };

  const [
    currentRevData,
    prevRevData,
    currentOrders,
    prevOrders,
    activeShippings,
    salesByDay,
    newUsersByDay,
    cityData,
    carrierData,
    topProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      where: { ...excludeFilter, createdAt: { gte: startDate } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { ...excludeFilter, createdAt: { gte: prevStartDate, lt: startDate } },
    }),
    prisma.order.count({ where: { ...excludeFilter, createdAt: { gte: startDate } } }),
    prisma.order.count({ where: { ...excludeFilter, createdAt: { gte: prevStartDate, lt: startDate } } }),
    prisma.shipping.count({ where: { status: { in: ['PREPARING', 'SHIPPED'] } } }),

    prisma.$queryRaw<{ day: Date; revenue: number; count: number }[]>`
      SELECT DATE_TRUNC('day', created_at) AS day,
             SUM(total)::float AS revenue,
             COUNT(*)::int AS count
      FROM orders
      WHERE created_at >= ${startDate}
        AND status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY day ORDER BY day ASC
    `,

    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT DATE_TRUNC('day', created_at) AS day,
             COUNT(*)::int AS count
      FROM users
      WHERE created_at >= ${startDate} AND role = 'CUSTOMER'
      GROUP BY day ORDER BY day ASC
    `,

    prisma.$queryRaw<{ city: string; count: number; revenue: number }[]>`
      SELECT a.city,
             COUNT(o.id)::int AS count,
             SUM(o.total)::float AS revenue
      FROM orders o
      JOIN addresses a ON o.address_id = a.id
      WHERE o.created_at >= ${startDate}
        AND o.status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY a.city
      ORDER BY count DESC LIMIT 8
    `,

    prisma.$queryRaw<{ carrier: string; total: number; delivered: number; avg_days: number | null }[]>`
      SELECT COALESCE(s.carrier, 'Belirtilmemiş') AS carrier,
             COUNT(*)::int AS total,
             COUNT(CASE WHEN s.delivered_at IS NOT NULL THEN 1 END)::int AS delivered,
             AVG(CASE WHEN s.delivered_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (s.delivered_at - o.created_at)) / 86400.0
                 END)::float AS avg_days
      FROM shippings s
      JOIN orders o ON s.order_id = o.id
      WHERE o.created_at >= ${startDate}
      GROUP BY s.carrier ORDER BY total DESC LIMIT 6
    `,

    prisma.$queryRaw<{ id: string; name: string; sku: string; qty: number; revenue: number }[]>`
      SELECT p.id, p.name, pv.sku,
             SUM(oi.quantity)::int AS qty,
             SUM(oi.quantity * oi.unit_price)::float AS revenue
      FROM order_items oi
      JOIN product_variants pv ON oi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= ${startDate}
        AND o.status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY p.id, p.name, pv.sku
      ORDER BY revenue DESC LIMIT 10
    `,
  ]);

  const currentRev = Number(currentRevData._sum?.total ?? 0);
  const prevRev = Number(prevRevData._sum?.total ?? 0);
  const aov = currentOrders > 0 ? currentRev / currentOrders : 0;

  return {
    kpi: {
      revenue: currentRev,
      revenueChange: prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : null,
      orders: currentOrders,
      ordersChange: prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : null,
      aov,
      activeShippings,
    },
    salesByDay: salesByDay.map((r) => ({ day: r.day, revenue: Number(r.revenue), count: Number(r.count) })),
    newUsersByDay: newUsersByDay.map((r) => ({ day: r.day, count: Number(r.count) })),
    cityData: cityData.map((r) => ({ city: r.city, count: Number(r.count), revenue: Number(r.revenue) })),
    carrierData: carrierData.map((r) => ({
      carrier: r.carrier,
      total: Number(r.total),
      delivered: Number(r.delivered),
      avgDays: r.avg_days !== null ? Number(r.avg_days) : null,
    })),
    topProducts: topProducts.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      qty: Number(r.qty),
      revenue: Number(r.revenue),
    })),
  };
}

// ─── Bildirimler & Mesajlar ───────────────────────────────────────────────────

export async function adminGetNewOrders() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const [orders, pendingCount] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ]);
  return { orders, pendingCount };
}

export async function adminListMessages() {
  const [messages, unreadCount] = await Promise.all([
    prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  return { messages, unreadCount };
}

export async function adminMarkMessageRead(id: string) {
  await prisma.contactMessage.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

// ─── Global Arama ────────────────────────────────────────────────────────────

export async function adminGlobalSearch(q: string) {
  const search = q.trim();
  const [products, orders, customers] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
        variants: { select: { sku: true, price: true }, take: 1 },
      },
      take: 5,
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { profile: { firstName: { contains: search, mode: 'insensitive' } } } },
          { user: { profile: { lastName: { contains: search, mode: 'insensitive' } } } },
        ],
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        user: {
          select: { email: true, profile: { select: { firstName: true, lastName: true } } },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { firstName: { contains: search, mode: 'insensitive' } } },
          { profile: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        email: true,
        profile: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    }),
  ]);
  return { products, orders, customers };
}

export async function getUserAnalyticsData() {
  const [
    cartItems,
    totalSubscribers,
    totalFavorites,
    wishlistItems,
    cartsWithItems,
    subscribers,
  ] = await Promise.all([
    prisma.cartItem.findMany({
      select: { quantity: true, priceAtAdd: true },
    }),
    prisma.newsletterSubscriber.count(),
    prisma.wishlistItem.count(),
    prisma.wishlistItem.findMany({
      include: {
        variant: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    }),
    prisma.cart.findMany({
      where: {
        items: { some: {} },
        userId: { not: null },
      },
      include: {
        user: {
          include: {
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        items: {
          include: {
            variant: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Sepette bekleyen toplam değer
  const totalCartValue = cartItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.priceAtAdd),
    0,
  );

  // En çok favorilenenler (Group by Product in-memory)
  const favMap = new Map<string, { id: string; image: string; name: string; sku: string; count: number }>();
  for (const item of wishlistItems) {
    const prod = item.variant?.product;
    if (!prod) continue;

    const key = prod.id;
    const existing = favMap.get(key);
    const primaryImg = prod.images[0]?.url || '/product-placeholder.png';

    if (existing) {
      existing.count += 1;
    } else {
      favMap.set(key, {
        id: prod.id,
        image: primaryImg,
        name: prod.name,
        sku: item.variant.sku,
        count: 1,
      });
    }
  }

  const favoritesList = Array.from(favMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Sepette bekleyenler (Terk edilme riski olan sepetler)
  const cartUsersList = cartsWithItems.map((cart, idx) => {
    const total = cart.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.priceAtAdd),
      0,
    );
    const itemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    const diffMs = Date.now() - new Date(cart.updatedAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    let timeStr = 'Az önce';
    if (diffMins >= 1440) {
      timeStr = `${Math.floor(diffMins / 1440)} gün önce`;
    } else if (diffMins >= 60) {
      timeStr = `${Math.floor(diffMins / 60)} saat önce`;
    } else if (diffMins > 0) {
      timeStr = `${diffMins} dk önce`;
    }

    return {
      id: cart.id || String(idx),
      name: cart.user?.profile
        ? `${cart.user.profile.firstName} ${cart.user.profile.lastName}`
        : 'Misafir Müşteri',
      email: cart.user?.email || 'N/A',
      items: itemsCount,
      total,
      updatedAt: timeStr,
    };
  });

  // Bülten aboneleri
  const mappedSubscribers = subscribers.map((sub) => ({
    id: sub.id,
    email: sub.email,
    date: sub.createdAt.toISOString().split('T')[0],
    status: sub.status as 'confirmed' | 'pending',
  }));

  // Trafik Kaynakları ve Cihaz Dağılımı — Umami yapılandırılmışsa gerçek veri,
  // değilse demo oranlar (Sistem Ayarları → Analytics)
  let trafficSources = [
    { label: 'Doğrudan', value: 35 },
    { label: 'Google', value: 30 },
    { label: 'Instagram', value: 20 },
    { label: 'Reklam', value: 15 },
  ];
  let deviceDistribution = { mobile: 75, desktop: 25 };

  const umami = await getUmamiData30d();
  if (umami) {
    if (umami.referrers.length > 0) {
      trafficSources = umami.referrers.slice(0, 4).map((r) => ({
        label: r.source,
        value: r.percentage,
      }));
    }
    deviceDistribution = {
      mobile: umami.devices.mobile + umami.devices.tablet,
      desktop: umami.devices.desktop,
    };
  }

  return {
    kpi: {
      totalCartValue,
      totalSubscribers,
      totalFavorites,
      cartUsersCount: cartsWithItems.length,
    },
    favorites: favoritesList,
    cartUsers: cartUsersList,
    subscribers: mappedSubscribers,
    trafficSources,
    deviceDistribution,
  };
}

// ─── Umami yardımcıları ───────────────────────────────────────────────────────

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// Referrer domain'ini okunur kaynak adına çevirir ('' → Doğrudan)
function referrerLabel(x: string | null): string {
  if (!x) return 'Doğrudan';
  const host = x.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (/google\./.test(host)) return 'Google';
  if (/instagram\.com/.test(host)) return 'Instagram';
  if (/facebook\.com|fb\.com/.test(host)) return 'Facebook';
  if (/(^|\.)t\.co$|twitter\.com|x\.com/.test(host)) return 'X (Twitter)';
  if (/youtube\.com|youtu\.be/.test(host)) return 'YouTube';
  if (/bing\.com/.test(host)) return 'Bing';
  if (/yandex\./.test(host)) return 'Yandex';
  return host;
}

interface UmamiData30d {
  referrers: Array<{ source: string; visitors: number; percentage: number }>;
  topPages: Array<{ url: string; views: number }>;
  devices: { mobile: number; desktop: number; tablet: number };
  browsers: Array<{ name: string; percentage: number; count: number }>;
  os: Array<{ name: string; percentage: number; count: number }>;
  summary: {
    totalVisitors: number;
    totalSessions: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
}

// Son 30 günün Umami verisini tek seferde çeker.
// Umami yapılandırılmamışsa veya erişilemiyorsa null döner.
async function getUmamiData30d(): Promise<UmamiData30d | null> {
  const cfg = await getUmamiConfig();
  if (!cfg) return null;

  const endAt = Date.now();
  const startAt = endAt - 30 * 24 * 60 * 60 * 1000;

  try {
    const [stats, referrers, pages, devices, browsers, os] = await Promise.all([
      fetchStats(cfg, startAt, endAt),
      fetchMetrics(cfg, 'referrer', startAt, endAt, 10),
      fetchMetrics(cfg, 'url', startAt, endAt, 5),
      fetchMetrics(cfg, 'device', startAt, endAt, 10),
      fetchMetrics(cfg, 'browser', startAt, endAt, 10),
      fetchMetrics(cfg, 'os', startAt, endAt, 10),
    ]);

    // Aynı etikete denk düşen referrer'ları birleştir (örn. google.com + google.com.tr)
    const refMap = new Map<string, number>();
    for (const r of referrers) {
      const label = referrerLabel(r.x);
      refMap.set(label, (refMap.get(label) ?? 0) + r.y);
    }
    const refTotal = [...refMap.values()].reduce((a, b) => a + b, 0);
    const mappedReferrers = [...refMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, visitors]) => ({
        source,
        visitors,
        percentage: pct(visitors, refTotal),
      }));

    const deviceOf = (name: string) =>
      devices.filter((d) => (d.x ?? '').toLowerCase() === name)
        .reduce((a, d) => a + d.y, 0);
    const mobile = deviceOf('mobile');
    const tablet = deviceOf('tablet');
    const desktop = deviceOf('desktop') + deviceOf('laptop');
    const deviceTotal = devices.reduce((a, d) => a + d.y, 0);

    const toDistribution = (rows: UmamiMetric[]) => {
      const total = rows.reduce((a, r) => a + r.y, 0);
      return rows
        .sort((a, b) => b.y - a.y)
        .map((r) => ({
          name: r.x || 'Bilinmiyor',
          percentage: pct(r.y, total),
          count: r.y,
        }));
    };

    const visits = stats.visits?.value ?? 0;

    return {
      referrers: mappedReferrers,
      topPages: pages.map((p) => ({ url: p.x || '/', views: p.y })),
      devices: {
        mobile: pct(mobile, deviceTotal),
        desktop: pct(desktop, deviceTotal),
        tablet: pct(tablet, deviceTotal),
      },
      browsers: toDistribution(browsers),
      os: toDistribution(os),
      summary: {
        totalVisitors: stats.visitors?.value ?? 0,
        totalSessions: visits,
        avgSessionDuration: visits > 0 ? Math.round((stats.totaltime?.value ?? 0) / visits) : 0,
        bounceRate: visits > 0 ? pct(stats.bounces?.value ?? 0, visits) : 0,
      },
    };
  } catch (err) {
    // Umami'ye ulaşılamadı — çağıran taraf demo veriye düşer
    console.error('Umami veri çekme hatası:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getTrafficAnalyticsData() {
  const umami = await getUmamiData30d();

  if (umami) {
    return {
      dataSource: 'umami' as const,
      trafficSources: umami.referrers,
      topPages: umami.topPages.map((p) => ({
        url: p.url,
        title: p.url,
        views: p.views,
        visitors: p.views,
      })),
      deviceDistribution: umami.devices,
      browserDistribution: umami.browsers,
      osDistribution: umami.os,
      summary: umami.summary,
    };
  }

  // Umami yapılandırılmamış → demo veri (Sistem Ayarları → Analytics'ten bağlanır)
  return {
    dataSource: 'demo' as const,
    trafficSources: [
      { source: 'Doğrudan', visitors: 1250, percentage: 35 },
      { source: 'Google', visitors: 1080, percentage: 30 },
      { source: 'Instagram', visitors: 720, percentage: 20 },
      { source: 'Reklam', visitors: 540, percentage: 15 },
    ],
    topPages: [
      { url: '/', title: 'Ana Sayfa', views: 4800, visitors: 2400 },
      { url: '/products', title: 'Ürünler', views: 3200, visitors: 1600 },
      { url: '/categories/tekstil', title: 'Tekstil Kategorisi', views: 2100, visitors: 1200 },
      { url: '/about', title: 'Hakkımızda', views: 1500, visitors: 800 },
      { url: '/contact', title: 'İletişim', views: 980, visitors: 500 },
    ],
    deviceDistribution: { mobile: 65, desktop: 30, tablet: 5 },
    browserDistribution: [
      { name: 'Chrome', percentage: 60, count: 2100 },
      { name: 'Safari', percentage: 20, count: 700 },
      { name: 'Firefox', percentage: 12, count: 420 },
      { name: 'Diğer', percentage: 8, count: 280 },
    ],
    osDistribution: [
      { name: 'Windows', percentage: 45, count: 1575 },
      { name: 'iOS', percentage: 28, count: 980 },
      { name: 'Android', percentage: 20, count: 700 },
      { name: 'macOS', percentage: 7, count: 245 },
    ],
    summary: {
      totalVisitors: 3500,
      totalSessions: 4200,
      avgSessionDuration: 420,
      bounceRate: 35,
    },
  };
}

export async function adminToggleSubscriberStatus(id: string) {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!sub) throw new AppError('Abone bulunamadı', 404);
  return prisma.newsletterSubscriber.update({
    where: { id },
    data: { status: sub.status === 'confirmed' ? 'pending' : 'confirmed' },
  });
}

export async function adminDeleteSubscriber(id: string) {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!sub) throw new AppError('Abone bulunamadı', 404);
  await prisma.newsletterSubscriber.delete({ where: { id } });
}

export async function adminCreateSubscriber(email: string, status?: string) {
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) throw new AppError('Bu e-posta adresi zaten kayıtlı', 409);
  return prisma.newsletterSubscriber.create({
    data: { email, status: status ?? 'confirmed' },
  });
}


