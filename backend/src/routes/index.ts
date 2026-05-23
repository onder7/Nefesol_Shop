import { Router } from 'express';
import healthRouter from './health';

const router = Router();

router.use('/health', healthRouter);

// Aşama 3: auth.routes.ts eklenecek
// router.use('/auth', authRouter);

// Aşama 4: product.routes.ts eklenecek
// router.use('/products', productRouter);
// router.use('/categories', categoryRouter);

// Aşama 5: cart.routes.ts eklenecek
// router.use('/cart', cartRouter);

// Aşama 6: order.routes.ts, payment.routes.ts eklenecek
// router.use('/orders', orderRouter);
// router.use('/payments', paymentRouter);

export default router;
