import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import * as orderSvc from '../services/orderService';
import * as paymentSvc from '../services/paymentService';
import * as emailSvc from '../services/emailService';

// Pending checkout data stored in Redis with 30-min TTL
const PENDING_TTL = 1800;
const pendingKey = (id: string) => `checkout:pending:${id}`;

interface PendingData { userId: string; addressId: string }

async function setPending(conversationId: string, data: PendingData) {
  await redis.setex(pendingKey(conversationId), PENDING_TTL, JSON.stringify(data));
}

async function getPending(conversationId: string): Promise<PendingData | null> {
  const raw = await redis.get(pendingKey(conversationId));
  return raw ? (JSON.parse(raw) as PendingData) : null;
}

async function delPending(conversationId: string) {
  await redis.del(pendingKey(conversationId));
}

function apiBase(req: Request) {
  // req.protocol respects X-Forwarded-Proto when trust proxy is enabled.
  // req.get('host') gives the original Host header (no internal port) behind nginx.
  return `${req.protocol}://${req.get('host') ?? req.hostname}`;
}

// ─── POST /api/checkout/initialize ───────────────────────────────────────────
export async function initialize(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { addressId } = req.body as { addressId: string };

    const [user, cart] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
      orderSvc.getCartForCheckout(userId),
    ]);

    if (!user) return next(Object.assign(new Error('Kullanıcı bulunamadı'), { status: 404 }));

    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) return next(Object.assign(new Error('Adres bulunamadı'), { status: 404 }));

    const subtotal = cart.items.reduce(
      (s, i) => s + Number(i.priceAtAdd) * i.quantity,
      0,
    );
    const shippingFee = orderSvc.computeShipping(subtotal);
    const total = subtotal + shippingFee;

    const conversationId = `${userId.slice(-6)}-${Date.now()}`;
    await setPending(conversationId, { userId, addressId });

    const contactName = `${address.firstName} ${address.lastName}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const base = apiBase(req);

    const formRes = await paymentSvc.initializeCheckoutForm(
      {
        conversationId,
        price: subtotal.toFixed(2),
        paidPrice: total.toFixed(2),
        callbackUrl: `${base}/api/checkout/callback`,
        buyer: {
          id: userId,
          name: user.profile?.firstName ?? 'Müşteri',
          surname: user.profile?.lastName ?? 'Ad',
          identityNumber: '11111111110',
          email: user.email,
          registrationDate: user.createdAt.toISOString().slice(0, 19).replace('T', ' '),
          lastLoginDate: now,
          registrationAddress: address.address,
          city: address.city,
          country: 'Turkey',
          ip: (req.ip ?? '127.0.0.1').replace('::ffff:', ''),
        },
        shippingAddress: {
          contactName,
          address: address.address,
          zipCode: address.postalCode ?? '00000',
          city: address.city,
          country: 'Turkey',
        },
        billingAddress: {
          contactName,
          address: address.address,
          zipCode: address.postalCode ?? '00000',
          city: address.city,
          country: 'Turkey',
        },
        basketItems: cart.items.map((item) => ({
          id: item.variantId,
          name: (item.variant as { product: { name: string; category: { name: string } } }).product.name,
          price: (Number(item.priceAtAdd) * item.quantity).toFixed(2),
          category1: (item.variant as { product: { name: string; category: { name: string } } }).product.category.name,
          itemType: 'PHYSICAL' as const,
        })),
      },
      base,
    );

    if (formRes.status !== 'success') {
      logger.error('Iyzico form hatası', { formRes });
      return next(Object.assign(new Error(formRes.errorMessage ?? 'Ödeme başlatılamadı'), { status: 502 }));
    }

    res.json({
      success: true,
      data: {
        checkoutFormContent: formRes.checkoutFormContent,
        token: formRes.token,
        conversationId,
        subtotal,
        shippingFee,
        total,
      },
    });
  } catch (err) { next(err); }
}

// ─── POST /api/checkout/callback (Iyzico browser redirect) ───────────────────
export async function callback(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, status, conversationId } = req.body as {
      token?: string;
      status?: string;
      conversationId?: string;
    };

    logger.info('Iyzico callback', { token, status, conversationId });

    if (!token || status === 'failure') {
      return res.redirect(`${env.FRONTEND_URL}/sepet?error=payment_failed`);
    }

    const detail = await paymentSvc.retrieveCheckoutForm(token);

    if (detail.status !== 'success' || detail.paymentStatus !== 'SUCCESS') {
      logger.warn('Iyzico ödeme başarısız', { detail });
      return res.redirect(`${env.FRONTEND_URL}/sepet?error=payment_failed`);
    }

    const cId = conversationId ?? detail.conversationId;
    if (!cId) return res.redirect(`${env.FRONTEND_URL}/sepet?error=session_lost`);

    const pending = await getPending(cId);
    if (!pending) {
      logger.error('Pending checkout bulunamadı', { cId });
      return res.redirect(`${env.FRONTEND_URL}/sepet?error=session_expired`);
    }

    const order = await orderSvc.createOrder(pending.userId, pending.addressId);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'iyzico',
        amount: order.total,
        status: 'SUCCESS',
        transactionId: detail.paymentId,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (user) {
      emailSvc
        .sendOrderConfirmation(user.email, order.id, Number(order.total),
          order.items.map((i) => ({
            name: i.variant.product.name,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
        )
        .catch((e) => logger.error('Email hatası', { error: e.message }));
    }

    await delPending(cId);
    res.redirect(`${env.FRONTEND_URL}/siparis-tamamlandi?orderId=${order.id}`);
  } catch (err) {
    logger.error('Callback hatası', { err });
    next(err);
  }
}

// ─── POST /api/checkout/dev-callback (test mode bypass) ──────────────────────
export async function devCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.query as { conversationId: string };
    const pending = await getPending(conversationId);
    if (!pending) {
      return res.status(400).json({ success: false, error: 'Oturum bulunamadı veya süresi doldu' });
    }

    const order = await orderSvc.createOrder(pending.userId, pending.addressId);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'dev_bypass',
        amount: order.total,
        status: 'SUCCESS',
        transactionId: `DEV_${Date.now()}`,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (user) {
      emailSvc
        .sendOrderConfirmation(user.email, order.id, Number(order.total),
          order.items.map((i) => ({
            name: i.variant.product.name,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
        )
        .catch(() => {});
    }

    await delPending(conversationId);
    res.json({
      success: true,
      redirectUrl: `${env.FRONTEND_URL}/siparis-tamamlandi?orderId=${order.id}`,
    });
  } catch (err) { next(err); }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
export async function listOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orders = await orderSvc.listOrders(req.user!.id);
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
}

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
export async function getOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderSvc.getOrderDetail(req.user!.id, req.params['id'] as string);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}
