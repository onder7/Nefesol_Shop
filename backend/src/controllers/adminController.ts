import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as adminService from '../services/adminService';

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getDashboardStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Products
export async function listProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const data = await adminService.adminListProducts({ page, limit, search });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await adminService.adminGetProduct(String(req.params.id));
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await adminService.adminCreateProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await adminService.adminUpdateProduct(String(req.params.id), req.body);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await adminService.adminDeleteProduct(String(req.params.id));
    res.json({ success: true, message: 'Ürün silindi' });
  } catch (err) {
    next(err);
  }
}

// Orders
export async function listOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const data = await adminService.adminListOrders({ page, limit, status, search });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await adminService.adminGetOrderDetail(String(req.params.id));
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body;
    const order = await adminService.adminUpdateOrderStatus(String(req.params.id), status, note);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// Customers
export async function listCustomers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const data = await adminService.adminListCustomers({ page, limit, search });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function toggleCustomerStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await adminService.adminToggleCustomerStatus(String(req.params.id));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// Categories & Brands
export async function listCategories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminListCategories();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listBrands(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminListBrands();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
