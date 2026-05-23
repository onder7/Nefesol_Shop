import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as ctrl from '../controllers/addressController';

const router = Router();

const addressSchema = z.object({
  type: z.enum(['BILLING', 'SHIPPING']).default('SHIPPING'),
  title: z.string().min(1).max(50),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().min(10).max(15),
  city: z.string().min(1).max(50),
  district: z.string().min(1).max(50),
  postalCode: z.string().max(10).optional(),
  address: z.string().min(5).max(250),
  isDefault: z.boolean().optional(),
});

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', validate(addressSchema), ctrl.create);
router.put('/:id', validate(addressSchema.partial()), ctrl.update);
router.delete('/:id', ctrl.remove);
router.patch('/:id/default', ctrl.setDefault);

export default router;
