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
import newsletterRouter from './newsletter';
import { getActiveRules } from '../controllers/chatbotController';
import { getShippingConfig, getMaintenanceConfig, getSettingsGroup } from '../services/settingsService';
import { optionalAuthenticate } from '../middlewares/auth';
import { AuthRequest } from '../types';

const router = Router();

router.use('/health', healthRouter);
router.get('/chatbot/rules', getActiveRules);
router.use('/auth', authRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/brands', brandsRouter);
router.use('/cart', cartRouter);
router.use('/addresses', addressesRouter);
router.use('/checkout', checkoutRouter);
router.use('/wishlist', wishlistRouter);
router.use('/admin', adminRouter);
router.use('/newsletter', newsletterRouter);

// Sosyal medya linkleri — public (footer ve ürün sayfası için)
router.get('/social-links', async (_req, res, next) => {
  try {
    const data = await getSettingsGroup('social_');
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Kargo konfigürasyonu — public (frontend sepet/checkout için)
router.get('/shipping-config', async (_req, res, next) => {
  try {
    const data = await getShippingConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/maintenance-status', async (_req, res, next) => {
  try {
    const data = await getMaintenanceConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/pages/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const allowedSlugs = ['iletisim', 'iade', 'sss', 'sozlesmeler'];
    if (!allowedSlugs.includes(slug)) {
      return res.status(404).json({ success: false, error: 'Sayfa bulunamadı' });
    }
    const { prisma } = await import('../config/database');
    const row = await prisma.siteSettings.findUnique({
      where: { key: `pages_${slug}` }
    });
    
    const defaults: Record<string, string> = {
      iletisim: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">İletişim & Destek</h1>
          <p class="text-slate-400">Bizimle iletişime geçmek için aşağıdaki kanalları kullanabilirsiniz. Destek ekibimiz en kısa sürede size dönüş yapacaktır.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <h3 class="text-lg font-semibold text-white mb-2">E-posta</h3>
              <p class="text-primary font-medium">destek@mabridgeglobal.com</p>
              <p class="text-xs text-slate-500 mt-1">7/24 e-posta gönderebilirsiniz.</p>
            </div>
            <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <h3 class="text-lg font-semibold text-white mb-2">Telefon</h3>
              <p class="text-primary font-medium">+90 (312) 000 00 00</p>
              <p class="text-xs text-slate-500 mt-1">Hafta içi: 09:00 - 18:00</p>
            </div>
          </div>
        </div>
      `,
      iade: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Kolay İade & Değişim</h1>
          <p class="text-slate-400">MaBridge üzerinden satın aldığınız ürünleri, teslimat tarihinden itibaren 14 gün içerisinde ücretsiz olarak iade edebilir veya değiştirebilirsiniz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">İade Koşulları</h2>
          <ul class="list-disc pl-5 space-y-2 text-slate-400 font-sans">
            <li>Ürünün orijinal ambalajı bozulmamış, kullanılmamış ve hasar görmemiş olmalıdır.</li>
            <li>Tüm aksesuarları ve faturası ile birlikte gönderilmelidir.</li>
            <li>Kişiselleştirilmiş ürünlerde iade yapılmamaktadır.</li>
          </ul>
        </div>
      `,
      sss: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Sıkça Sorulan Sorular</h1>
          <div class="space-y-4">
            <div class="border-b border-slate-800 pb-4">
              <h3 class="text-lg font-semibold text-white mb-1">Siparişim ne zaman kargoya verilir?</h3>
              <p class="text-slate-400 font-sans">Hafta içi saat 15:00'e kadar verilen siparişler aynı gün kargoya verilir.</p>
            </div>
            <div class="border-b border-slate-800 pb-4">
              <h3 class="text-lg font-semibold text-white mb-1">Kargo ücreti ne kadar?</h3>
              <p class="text-slate-400 font-sans">500 TL ve üzeri alışverişlerinizde kargo ücretsizdir. Diğer siparişler için standart kargo ücreti 49.90 TL'dir.</p>
            </div>
            <div class="border-b border-slate-800 pb-4">
              <h3 class="text-lg font-semibold text-white mb-1">Ödeme seçenekleriniz nelerdir?</h3>
              <p class="text-slate-400 font-sans">Kredi kartı (iyzico / PayTR) ve kapıda nakit ödeme seçeneklerimiz mevcuttur.</p>
            </div>
          </div>
        </div>
      `,
      sozlesmeler: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Şartlar & Politikalar</h1>
          <p class="text-slate-400">MaBridge web sitesini kullanarak aşağıdaki üyelik sözleşmesi, gizlilik politikası ve mesafeli satış sözleşmesi şartlarını kabul etmiş olursunuz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">1. Gizlilik Politikası</h2>
          <p class="text-slate-400 font-sans">Kişisel verileriniz KVKK kapsamında korunmakta ve üçüncü şahıslarla paylaşılmamaktadır.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">2. Mesafeli Satış Sözleşmesi</h2>
          <p class="text-slate-400 font-sans">Satın alma işlemlerinde Tüketici Hakları Kanunu geçerlidir.</p>
        </div>
      `,
    };
    
    res.json({
      success: true,
      data: {
        slug,
        content: row?.value ?? defaults[slug] ?? ''
      }
    });
  } catch (err) { next(err); }
});

router.get('/slides', async (_req, res, next) => {
  try {
    const { prisma } = await import('../config/database');
    const row = await prisma.siteSettings.findUnique({
      where: { key: 'homepage_slides' }
    });
    
    const defaults = [
      { img: '/banner-yaz.png', link: '/ara?search=yaz' },
      { img: '/banner-yilbasi.png', link: '/ara?search=yılbaşı' },
      { img: '/banner-sonbahar.png', link: '/ara?search=turuncu' }
    ];
    
    let slides = defaults;
    if (row && row.value) {
      try {
        slides = JSON.parse(row.value);
      } catch (err) {
        console.error('Failed to parse slides setting:', err);
      }
    }
    
    res.json({ success: true, data: slides });
  } catch (err) { next(err); }
});

router.post('/contact', optionalAuthenticate, async (req: AuthRequest, res, next) => {
  try {
    const { name, email, subject, body } = req.body;
    if (!name || !email || !body) {
      return res.status(400).json({ success: false, error: 'Ad, e-posta ve mesaj alanları zorunludur.' });
    }
    const { prisma } = await import('../config/database');
    const msg = await prisma.contactMessage.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim(),
        subject: subject ? String(subject).trim() : null,
        body: String(body).trim(),
        userId: req.user?.id || null,
      }
    });
    res.json({ success: true, data: msg });
  } catch (err) { next(err); }
});

export default router;
