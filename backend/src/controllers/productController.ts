import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/productService';

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val || undefined;
  if (Array.isArray(val)) return typeof val[0] === 'string' ? val[0] : undefined;
  return undefined;
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, minPrice, maxPrice } = req.query;
    const result = await svc.listProducts({
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
      search: qs(req.query.search),
      categorySlug: qs(req.query.category),
      brandId: qs(req.query.brand),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort: qs(req.query.sort) as svc.ProductFilters['sort'],
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await svc.getProductBySlug(req.params['slug'] as string);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function getFeatured(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await svc.getFeaturedProducts(Number(req.query.limit) || 8);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await svc.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await svc.getCategoryBySlug(req.params['slug'] as string);
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function getBrands(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brands = await svc.listBrands();
    res.json({ success: true, data: brands });
  } catch (err) {
    next(err);
  }
}
