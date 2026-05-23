import { Router } from 'express';
import * as ctrl from '../controllers/reviewController';
import { authenticate } from '../middlewares/auth';

const router = Router({ mergeParams: true });

// GET /products/:productId/reviews
router.get('/', ctrl.getReviews);

// POST /products/:productId/reviews  (giriş zorunlu)
router.post('/', authenticate, ctrl.addReview);

// DELETE /products/:productId/reviews/:reviewId
router.delete('/:reviewId', authenticate, ctrl.deleteReview);

export default router;
