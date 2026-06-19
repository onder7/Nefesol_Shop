import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import * as ctrl from '../controllers/authController';

const router = Router();

const registerSchema = z.object({
  email: z.email('Geçerli bir e-posta giriniz'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
    .regex(/[0-9]/, 'En az bir rakam içermeli'),
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalı').max(50),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalı').max(50),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

const forgotPasswordSchema = z.object({
  email: z.email('Geçerli bir e-posta giriniz'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
    .regex(/[0-9]/, 'En az bir rakam içermeli'),
});

const profileUpdateSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().max(15).optional(),
});

const guestLoginSchema = z.object({
  email: z.email('Geçerli bir e-posta giriniz'),
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalı').max(50),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalı').max(50),
  phone: z.string().optional(),
});

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/guest-login', validate(guestLoginSchema), ctrl.guestLogin);
router.post('/logout', authenticate, ctrl.logout);
router.post('/refresh-token', ctrl.refreshToken);
router.get('/me', authenticate, ctrl.getMe);
router.put('/profile', authenticate, validate(profileUpdateSchema), ctrl.updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword);
router.post('/forgot-password', validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);

export default router;
