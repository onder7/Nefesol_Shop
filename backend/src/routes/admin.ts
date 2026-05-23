import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth';
import * as ctrl from '../controllers/adminController';
import { uploadImage } from '../middlewares/upload';
import { uploadProductImage } from '../controllers/uploadController';

const router = Router();

router.use(authenticate, requireAdmin);

// Dashboard
router.get('/stats', ctrl.getStats);

// Upload
router.post('/upload', uploadImage.single('file'), uploadProductImage);

// Products
router.get('/products', ctrl.listProducts);
router.post('/products', ctrl.createProduct);
router.get('/products/:id', ctrl.getProduct);
router.put('/products/:id', ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

// Orders
router.get('/orders', ctrl.listOrders);
router.get('/orders/:id', ctrl.getOrderDetail);
router.put('/orders/:id/status', ctrl.updateOrderStatus);

// Customers
router.get('/customers', ctrl.listCustomers);
router.put('/customers/:id/toggle-status', ctrl.toggleCustomerStatus);

// Lookups
router.get('/categories', ctrl.listCategories);
router.get('/brands', ctrl.listBrands);

export default router;
