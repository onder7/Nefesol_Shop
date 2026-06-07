import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as ctrl from '../controllers/checkoutController';
import * as cancelCtrl from '../controllers/cancellationController';

const router = Router();

const initSchema = z.object({
  addressId: z.string().min(1),
});

const placeOrderSchema = z.object({
  addressId: z.string().min(1),
  method: z.enum(['cod', 'havale']),
});

// Public
router.get('/payment-methods', ctrl.paymentMethods);

// Checkout flow
router.post('/initialize', authenticate, validate(initSchema), ctrl.initialize);
router.post('/place-order', authenticate, validate(placeOrderSchema), ctrl.placeOrder);
router.post('/callback', ctrl.callback);            // Iyzico posts here (no auth)
router.post('/dev-callback', ctrl.devCallback);     // Test mode bypass

// Orders (authenticated)
router.get('/orders', authenticate, ctrl.listOrders);
router.get('/orders/:id', authenticate, ctrl.getOrder);

// Order Cancellation (customer)
router.post('/orders/:orderId/cancel-request', authenticate, cancelCtrl.requestCancellation as any);
router.get('/orders/:orderId/cancellation', authenticate, cancelCtrl.getOrderCancellation as any);

// Cancellation Management (admin)
router.get('/admin/cancellations', authenticate, requireAdmin, cancelCtrl.listCancellations as any);
router.get('/admin/cancellations/:cancellationId', authenticate, requireAdmin, cancelCtrl.getCancellation as any);
router.put('/admin/cancellations/:cancellationId/approve', authenticate, requireAdmin, cancelCtrl.approveCancellation as any);
router.put('/admin/cancellations/:cancellationId/reject', authenticate, requireAdmin, cancelCtrl.rejectCancellation as any);
router.delete('/admin/cancellations/:cancellationId/unreject', authenticate, requireAdmin, cancelCtrl.unrejectCancellation as any);
router.post('/admin/cancellations/:cancellationId/refund', authenticate, requireAdmin, cancelCtrl.processRefund as any);

export default router;
