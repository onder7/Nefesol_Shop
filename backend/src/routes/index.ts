import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import productsRouter from './products';
import categoriesRouter from './categories';
import brandsRouter from './brands';
import cartRouter from './cart';
import addressesRouter from './addresses';
import checkoutRouter from './checkout';
import wishlistRouter from './wishlist';
import adminRouter from './admin';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/brands', brandsRouter);
router.use('/cart', cartRouter);
router.use('/addresses', addressesRouter);
router.use('/checkout', checkoutRouter);
router.use('/wishlist', wishlistRouter);
router.use('/admin', adminRouter);

export default router;
