import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as ctrl from '../controllers/checkoutController';

const router = Router();

const initSchema = z.object({
  addressId: z.string().min(1),
});

// Checkout flow
router.post('/initialize', authenticate, validate(initSchema), ctrl.initialize);
router.post('/callback', ctrl.callback);            // Iyzico posts here (no auth)
router.post('/dev-callback', ctrl.devCallback);     // Test mode bypass

// Orders (authenticated)
router.get('/orders', authenticate, ctrl.listOrders);
router.get('/orders/:id', authenticate, ctrl.getOrder);

export default router;
