import { prisma } from '../config/database';
import { AppError } from '../types';
import { Prisma } from '@prisma/client';

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
  variants: {
    id?: string;
    sku: string;
    price: number;
    compareAt?: number;
    stockQty: number;
    attributes?: Record<string, string>;
  }[];
  images?: { url: string; altText?: string; isPrimary?: boolean; sortOrder?: number }[];
  tags?: string[];
}

export async function adminListProducts(params: { page?: number; limit?: number; search?: string }) {
  const { page = 1, limit = 20, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

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
      variants: {
        create: data.variants.map((v) => ({
          sku: v.sku,
          price: v.price,
          compareAt: v.compareAt,
          stockQty: v.stockQty,
          attributes: v.attributes ?? {},
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
      variants: true,
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
      },
    });

    // Varyantları güncelle (formdan gelen liste)
    if (data.variants) {
      const incomingIds = data.variants.filter((v) => v.id).map((v) => v.id!);

      // Listede olmayan aktif varyantları devre dışı bırak (FK sorunu yaratmadan)
      await tx.productVariant.updateMany({
        where: { productId: id, id: { notIn: incomingIds }, isActive: true },
        data: { isActive: false },
      });

      // Mevcut varyantları güncelle
      for (const v of data.variants.filter((v) => v.id)) {
        await tx.productVariant.update({
          where: { id: v.id! },
          data: {
            sku: v.sku,
            price: v.price,
            compareAt: v.compareAt ?? null,
            stockQty: v.stockQty,
            attributes: v.attributes ?? {},
            isActive: true,
          },
        });
      }

      // Yeni varyantları oluştur
      for (const v of data.variants.filter((v) => !v.id)) {
        await tx.productVariant.create({
          data: {
            productId: id,
            sku: v.sku,
            price: v.price,
            compareAt: v.compareAt,
            stockQty: v.stockQty,
            attributes: v.attributes ?? {},
          },
        });
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
      include: { variants: { where: { isActive: true } }, images: true, tags: true },
    });
  });
}

export async function adminGetProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
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
}) {
  const { page = 1, limit = 20, status, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status as never;
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
        items: { select: { quantity: true, unitPrice: true } },
        address: { select: { city: true, district: true } },
        payment: { select: { status: true } },
      },
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
    return updated;
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

export async function adminListBrands() {
  return prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}
