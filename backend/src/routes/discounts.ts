import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

// ─── POST /api/discounts/validate - İndirim kodunu doğrula
router.post('/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Kupon kodu gerekli' });
    }

    const discount = await prisma.discount.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount) {
      // Doğrulama hatası "kaynak bulunamadı" değildir → 200 + success:false
      // (Tarayıcı konsolu 404/400 kırmızı hatayla dolmaz; frontend mesajı gösterir)
      return res.json({ success: false, error: 'Kupon kodu geçersiz' });
    }

    if (!discount.isActive) {
      return res.json({ success: false, error: 'Bu kupon aktif değil' });
    }

    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return res.json({ success: false, error: 'Bu kupon süresi dolmuş' });
    }

    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return res.json({ success: false, error: 'Bu kupon kullanım limitine ulaştı' });
    }

    res.json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/discounts - İndirimleri listele (ADMIN)
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const discounts = await prisma.discount.findMany({
      include: { usages: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const data = discounts.map((d: any) => ({
      ...d,
      usageCount: d.usages.length,
      usages: undefined,
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/discounts - İndirim oluştur (ADMIN)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt, description, isActive } = req.body;

    const discount = await prisma.discount.create({
      data: {
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        minOrder: minOrder ? parseFloat(minOrder) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/discounts/:id - İndirim detayı (ADMIN)
router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: { usages: true },
    });

    if (!discount) {
      return res.status(404).json({ error: 'İndirim bulunamadı' });
    }

    res.json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PUT /api/discounts/:id - İndirim güncelle (ADMIN)
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { code, type, value, minOrder, maxUses, expiresAt, isActive } = req.body;

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        code: code?.toUpperCase(),
        type,
        value: value ? parseFloat(value) : undefined,
        minOrder: minOrder ? parseFloat(minOrder) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
      },
    });

    res.json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/discounts/:id - İndirim sil (ADMIN)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.discount.delete({
      where: { id },
    });

    res.json({ success: true, message: 'İndirim silindi' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
