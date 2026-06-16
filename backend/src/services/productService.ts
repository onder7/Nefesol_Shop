import { prisma } from '../config/database';
import { AppError } from '../types';
import { Prisma } from '@prisma/client';

export interface ProductFilters {
  categorySlug?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
}

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true, sku: true, price: true, compareAt: true,
      stockQty: true, desi: true,
      attributeValues: {
        select: {
          attributeValue: {
            select: {
              id: true, value: true, colorHex: true, sortOrder: true,
              attribute: { select: { id: true, name: true, slug: true, inputType: true, sortOrder: true } },
            },
          },
        },
      },
    },
  },
  images: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, url: true, altText: true, isPrimary: true },
  },
  tags: { select: { tag: true } },
  _count: { select: { reviews: { where: { isApproved: true } } } },
} satisfies Prisma.ProductInclude;

export async function listProducts(filters: ProductFilters = {}) {
  const { page = 1, limit = 20, search, categorySlug, brandId, minPrice, maxPrice, sort = 'newest' } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { some: { tag: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  if (categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) throw new AppError('Kategori bulunamadı', 404);
    const descendantIds = await getCategoryDescendantIds(category.id);
    where.categoryId = { in: [category.id, ...descendantIds] };
  }

  if (brandId) where.brandId = brandId;

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.variants = {
      some: {
        isActive: true,
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      },
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc' ? { variants: { _count: 'asc' } }
    : sort === 'price_desc' ? { variants: { _count: 'desc' } }
    : sort === 'popular' ? { reviews: { _count: 'desc' } }
    : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, include: productInclude, orderBy, skip, take: limit }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      ...productInclude,
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { include: { profile: true } } },
      },
    },
  });
  if (!product || !product.isActive) throw new AppError('Ürün bulunamadı', 404);
  return product;
}

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: productInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: {
      children: {
        where: { isActive: true },
        select: { id: true, name: true, slug: true, imageUrl: true, showInMenu: true },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: { where: { isActive: true }, select: { id: true, name: true, slug: true } },
      parent: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!category || !category.isActive) throw new AppError('Kategori bulunamadı', 404);
  return category;
}

export async function listBrands() {
  return prisma.brand.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, logoUrl: true },
    orderBy: { name: 'asc' },
  });
}

async function getCategoryDescendantIds(categoryId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  const ids = children.map((c) => c.id);
  for (const child of children) {
    const deeper = await getCategoryDescendantIds(child.id);
    ids.push(...deeper);
  }
  return ids;
}
