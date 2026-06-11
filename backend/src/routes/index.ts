import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import mfaRouter from './mfa';
import oauthRouter from './oauth';
import productsRouter from './products';
import categoriesRouter from './categories';
import brandsRouter from './brands';
import cartRouter from './cart';
import addressesRouter from './addresses';
import checkoutRouter from './checkout';
import wishlistRouter from './wishlist';
import reviewsRouter from './reviews';
import profileRouter from './profile';
import adminRouter from './admin';
import newsletterRouter from './newsletter';
import pricingRouter from './pricing';
import campaignsRouter from './campaigns';
import discountsRouter from './discounts';
import { getActiveRules } from '../controllers/chatbotController';
import { getSetupStatus, postSetup } from '../controllers/setupController';
import { getActivePopup } from '../controllers/popupController';
import { getActiveCampaign } from '../controllers/discountCampaignController';
import { getShippingConfig, getMaintenanceConfig, getSettingsGroup, getTaxConfig, getStoreIdentity } from '../services/settingsService';
import { getPublicUmamiConfig } from '../services/umamiService';
import { optionalAuthenticate } from '../middlewares/auth';
import { AuthRequest } from '../types';

const router = Router();

router.use('/health', healthRouter);

// İlk kurulum sihirbazı (public — postSetup admin yoksa çalışır, varsa 409)
router.get('/setup/status', getSetupStatus);
router.post('/setup', postSetup);

router.get('/chatbot/rules', getActiveRules);
router.get('/popup', getActivePopup);
router.get('/campaign', getActiveCampaign);
router.use('/auth', authRouter);
router.use('/mfa', mfaRouter);
router.use('/', oauthRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/brands', brandsRouter);
router.use('/cart', cartRouter);
router.use('/addresses', addressesRouter);
router.use('/checkout', checkoutRouter);
router.use('/wishlist', wishlistRouter);
router.use('/reviews', reviewsRouter);
router.use('/profile', profileRouter);
router.use('/admin', adminRouter);
router.use('/newsletter', newsletterRouter);
router.use('/pricing', pricingRouter);
router.use('/campaigns', campaignsRouter);
router.use('/discounts', discountsRouter);

// Mağaza logosu — public (header için)
router.get('/store-logo', async (_req, res, next) => {
  try {
    const data = await getSettingsGroup('general_');
    res.json({ success: true, data: { logo_url: data.logo_url || null } });
  } catch (err) { next(err); }
});

// Firma iletişim bilgileri — public (iletişim sayfası için)
router.get('/company-info', async (_req, res, next) => {
  try {
    const data = await getSettingsGroup('general_');
    res.json({ success: true, data: {
      name: data.store_name || 'Mağaza',
      legalName: data.legal_name || data.store_name || 'Mağaza',
      email: data.email || 'info@example.com',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      mapEmbed: data.mapEmbed || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d195884.30030588698!2d32.62267988358488!3d39.90329181165241!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14d347d520730525%3A0xb89a3c7db2bc3397!2sAnkara!5e0!3m2!1str!2str!4v1700000000000!5m2!1str!2str'
    } });
  } catch (err) { next(err); }
});

// Umami izleme script bilgisi — public (frontend tracking için; kimlik bilgisi içermez)
router.get('/analytics-config', async (_req, res, next) => {
  try {
    const data = await getPublicUmamiConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

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

// KDV konfigürasyonu — public (frontend sepet/checkout için)
router.get('/tax-config', async (_req, res, next) => {
  try {
    const data = await getTaxConfig();
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
    const allowedSlugs = ['iletisim', 'iade', 'sss', 'sozlesmeler', 'hakkimizda', 'kvkk', 'uyelik'];
    if (!allowedSlugs.includes(slug)) {
      return res.status(404).json({ success: false, error: 'Sayfa bulunamadı' });
    }
    const { prisma } = await import('../config/database');
    const row = await prisma.siteSettings.findUnique({
      where: { key: `pages_${slug}` }
    });

    // Varsayılan sayfa içeriklerindeki marka/iletişim bilgisi ayarlardan gelir
    const store = await getStoreIdentity();

    const defaults: Record<string, string> = {
      iletisim: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">İletişim & Destek</h1>
          <p class="text-slate-400">Bizimle iletişime geçmek için aşağıdaki kanalları kullanabilirsiniz. Destek ekibimiz en kısa sürede size dönüş yapacaktır.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <h3 class="text-lg font-semibold text-white mb-2">E-posta</h3>
              <p class="text-primary font-medium">${store.email}</p>
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
          <p class="text-slate-400">${store.name} üzerinden satın aldığınız ürünleri, teslimat tarihinden itibaren 14 gün içerisinde ücretsiz olarak iade edebilir veya değiştirebilirsiniz.</p>
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
          <p class="text-slate-400">${store.name} web sitesini kullanarak aşağıdaki üyelik sözleşmesi, gizlilik politikası ve mesafeli satış sözleşmesi şartlarını kabul etmiş olursunuz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">1. Gizlilik Politikası</h2>
          <p class="text-slate-400 font-sans">Kişisel verileriniz KVKK kapsamında korunmakta ve üçüncü şahıslarla paylaşılmamaktadır.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">2. Mesafeli Satış Sözleşmesi</h2>
          <p class="text-slate-400 font-sans">Satın alma işlemlerinde Tüketici Hakları Kanunu geçerlidir.</p>
        </div>
      `,
      hakkimizda: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Hakkımızda</h1>
          <p class="text-slate-400">${store.name}, kalite ve güvenirliliğin simgesidir. Kuruluşundan itibaren müşteri memnuniyetini ön planda tutarak hizmet vermekteyiz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">Misyonumuz</h2>
          <p class="text-slate-400 font-sans">En kaliteli ürünleri en uygun fiyatlarla sunarak, her müşterinin evini daha güzel ve konforlu bir yer haline getirmek.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">Vizyonumuz</h2>
          <p class="text-slate-400 font-sans">Çeyiz ve ev tekstili sektöründe Türkiye'nin en güvenilir ve tercih edilen e-ticaret platformu olmak.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">Değerlerimiz</h2>
          <ul class="list-disc pl-5 space-y-2 text-slate-400 font-sans">
            <li>Müşteri Memnuniyeti: Her zaman müşterinin ihtiyaçlarını ön planda tutuyor, hızlı ve kaliteli hizmet sunuyoruz.</li>
            <li>Kalite: Ürünlerimiz en yüksek kalite standartlarını karşılamak üzere seçilmektedir.</li>
            <li>Güvenilirlik: Tüm işlemlerde şeffaflık ve dürüstlüğü prensip ediyoruz.</li>
            <li>İnovasyon: Teknoloji kullanarak müşteri deneyimini sürekli geliştiriyoruz.</li>
          </ul>
        </div>
      `,
      kvkk: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">KVKK Sözleşmesi (Gizlilik Politikası)</h1>
          <p class="text-slate-400">6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, kişisel verilerinizin nasıl işlendiğini açıklamak istiyoruz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">1. Veri Sahibinin Hakları</h2>
          <p class="text-slate-400 font-sans">Kişisel verileriniz hakkında bilgi sahibi olmak, düzeltmesini isteyebilmek, silinmesini talep edebilmek gibi haklara sahipsiniz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">2. Verilerin Kullanımı</h2>
          <p class="text-slate-400 font-sans">Toplanan kişisel verileriniz, siparişlerinizi işlemek, kargo göndermek, müşteri hizmetleri sağlamak ve kanuni yükümlülükleri yerine getirmek amacıyla kullanılır.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">3. Veri Güvenliği</h2>
          <p class="text-slate-400 font-sans">Verileriniz en modern şifreleme teknolojileri kullanılarak korunmakta ve üçüncü şahıslarla izinsiz paylaşılmamaktadır.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">4. İletişim</h2>
          <p class="text-slate-400 font-sans">Veri konusunda sorularınız için: ${store.email} adresine yazabilirsiniz.</p>
        </div>
      `,
      uyelik: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Üyelik Sözleşmesi</h1>
          <p class="text-slate-400">${store.name} platformunda üyeliğiniz ile ilgili hak ve sorumlulukları açıklamak istiyoruz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">1. Üyelik Şartları</h2>
          <ul class="list-disc pl-5 space-y-2 text-slate-400 font-sans">
            <li>18 yaşından büyük olmanız gerekir.</li>
            <li>Gerçek kişi veya yasal tüzel kişi olmanız şarttır.</li>
            <li>Sahte, yanıltıcı bilgi vermeniz yasaktır.</li>
          </ul>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">2. Üyelik Hakkı</h2>
          <p class="text-slate-400 font-sans">Üyelik iptal edilmesi durumunda sipariş verme, cari bakiye ve diğer hizmetlerden faydalanma hakkınız sona erer.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">3. Sorumluluklar</h2>
          <p class="text-slate-400 font-sans">Şifrenizin gizliliğini sağlamaktan, verdiğiniz bilgilerin doğruluğundan ve hesabınızda yapılan işlemlerden siz sorumlusunuz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">4. Kısıtlamalar</h2>
          <p class="text-slate-400 font-sans">Platform herhangi bir nedenden dolayı hesabı kapatma veya kısıtlama hakkına sahiptir.</p>
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
