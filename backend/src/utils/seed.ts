import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── JSON veri tipleri ───────────────────────────────────────────────────────
interface MockCategory {
  id: string;
  name: string;
  slug: string;
}

interface MockVariant {
  sku: string;
  color: string;
  price: number;
  stock: number;
}

interface MockProduct {
  id: string;
  categoryId: string;
  brandId: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  variants: MockVariant[];
  images: string[];
  tags: string[];
  reviews: any[];
}

interface MockData {
  categories: MockCategory[];
  products: MockProduct[];
}

// ─── Kategori açıklamaları ──────────────────────────────────────────────────
const categoryDescriptions: Record<string, string> = {
  'nevresim-takimlari': '%100 Pamuklu, 3D baskılı, çift ve tek kişilik modern nevresim takımları.',
  'ceyizlik-urunler': 'Evlilik hazırlığı yapanlar için özenle seçilmiş çeyizlik ürünler.',
  'yatak-ortuleri': 'Çift ve tek kişilik, kapitoneli, jakarlı ve dantelli lüks yatak örtüsü modelleri.',
  'pike-takimlari': 'Yaz ve bahar aylarına uygun günlük ve çeyizlik şık pike modelleri.',
  'banyo': 'Havlu, bornoz ve banyo aksesuarları.',
  'masa-ortuleri': 'Şık ve kaliteli masa örtüsü modelleri.',
  'battaniye': 'Sıcak ve yumuşak battaniye çeşitleri.',
  'carsaf-alez': 'Pamuklu çarşaflar ve koruyucu alezler.',
  'hali': 'Modern ve klasik halı modelleri.',
  'yastik-yorgan': 'Konforlu uyku için yastık ve yorgan çeşitleri.',
};

async function main() {
  console.log('🧹 Veritabanı temizleniyor...');

  // Tüm verileri sil (sıralama önemli - foreign key constraints)
  await prisma.review.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.discountUsage.deleteMany({});
  await prisma.discount.deleteMany({});
  await prisma.shipping.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderStatusLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.productTag.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Veritabanı temizlendi\n');
  console.log('🌱 Seed başlıyor...\n');

  // ─── Kullanıcılar ─────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecommerce.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      profile: {
        create: { firstName: 'Admin', lastName: 'User' },
      },
    },
  });
  console.log(`👤 Admin: ${admin.email}`);

  const customerHash = await bcrypt.hash('Test123!', 12);
  const customer = await prisma.user.create({
    data: {
      email: 'test@ecommerce.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      profile: {
        create: { firstName: 'Test', lastName: 'Kullanıcı' },
      },
    },
  });
  console.log(`👤 Müşteri: ${customer.email}\n`);

  // ─── JSON dosyasını oku ───────────────────────────────────────────────────
  const jsonPath = path.resolve(__dirname, '../../../ceyiz_diyari_mock_db-v2.json');
  console.log(`📄 JSON dosyası okunuyor: ${jsonPath}`);
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON dosyası bulunamadı:', jsonPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const mockData: MockData = JSON.parse(rawData);
  console.log(`   → ${mockData.categories.length} kategori, ${mockData.products.length} ürün bulundu\n`);

  // ─── Markalar ─────────────────────────────────────────────────────────────
  const tacBrand = await prisma.brand.create({
    data: { name: 'TAÇ', slug: 'tac' },
  });
  const karacaBrand = await prisma.brand.create({
    data: { name: 'Karaca', slug: 'karaca' },
  });
  const englishHomeBrand = await prisma.brand.create({
    data: { name: 'English Home', slug: 'english-home' },
  });
  const ceyizDiyariBrand = await prisma.brand.create({
    data: { name: 'Çeyiz Diyarı', slug: 'ceyiz-diyari' },
  });
  console.log('🏷️  4 marka eklendi (TAÇ, Karaca, English Home, Çeyiz Diyarı)\n');

  // ─── Kategoriler (JSON'dan) ───────────────────────────────────────────────
  const categoryMap = new Map<string, string>(); // JSON id → DB id

  for (let i = 0; i < mockData.categories.length; i++) {
    const cat = mockData.categories[i];
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: categoryDescriptions[cat.slug] || `${cat.name} kategorisi.`,
        sortOrder: i + 1,
      },
    });
    categoryMap.set(cat.id, created.id);
    console.log(`   📂 ${i + 1}. ${cat.name} (${cat.slug})`);
  }
  console.log(`\n✅ ${mockData.categories.length} kategori eklendi\n`);

  // ─── Ürünler (JSON'dan) ───────────────────────────────────────────────────
  let productCount = 0;
  let variantCount = 0;
  let imageCount = 0;
  let tagCount = 0;

  for (const prod of mockData.products) {
    // Kategori ID'sini map'ten al
    const dbCategoryId = categoryMap.get(prod.categoryId);
    if (!dbCategoryId) {
      console.warn(`⚠️  Ürün atlandı (kategori bulunamadı): ${prod.name}`);
      continue;
    }

    // Ürünü oluştur (varyantlar, görseller, etiketler dahil)
    await prisma.product.create({
      data: {
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        isActive: prod.isActive,
        isFeatured: prod.isFeatured,
        categoryId: dbCategoryId,
        brandId: ceyizDiyariBrand.id,  // Tüm ürünler Çeyiz Diyarı markasına ait
        variants: {
          create: prod.variants.map((v) => ({
            sku: v.sku,
            price: v.price,
            stockQty: v.stock,
            attributes: { color: v.color },
          })),
        },
        images: {
          create: prod.images.map((url, idx) => ({
            url: url,
            altText: `${prod.name} - Görsel ${idx + 1}`,
            sortOrder: idx,
            isPrimary: idx === 0,
          })),
        },
        tags: {
          create: prod.tags.map((tag) => ({
            tag: tag,
          })),
        },
      },
    });

    productCount++;
    variantCount += prod.variants.length;
    imageCount += prod.images.length;
    tagCount += prod.tags.length;

    // Her 10 üründe bir ilerleme göster
    if (productCount % 10 === 0) {
      console.log(`   🛍️  ${productCount}/${mockData.products.length} ürün eklendi...`);
    }
  }

  console.log(`\n✅ Ürün verileri eklendi:`);
  console.log(`   🛍️  ${productCount} ürün`);
  console.log(`   📦 ${variantCount} varyant`);
  console.log(`   🖼️  ${imageCount} görsel`);
  console.log(`   🏷️  ${tagCount} etiket\n`);

  // ─── İndirim kuponları ────────────────────────────────────────────────────
  await prisma.discount.create({
    data: {
      code: 'HOSGELDIN10',
      type: 'PERCENT',
      value: 10,
      minOrder: 500,
      maxUses: 1000,
      isActive: true,
    },
  });
  await prisma.discount.create({
    data: {
      code: 'CEYIZ15',
      type: 'PERCENT',
      value: 15,
      minOrder: 2000,
      maxUses: 200,
      isActive: true,
    },
  });
  await prisma.discount.create({
    data: {
      code: 'INDIRIM100',
      type: 'FIXED',
      value: 100,
      minOrder: 1000,
      maxUses: 500,
      isActive: true,
    },
  });
  console.log('🎟️  3 indirim kuponu eklendi\n');

  // ─── Özet ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Seed tamamlandı!');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('👤 Kullanıcılar:');
  console.log('   Admin   → admin@ecommerce.com / Admin123!');
  console.log('   Müşteri → test@ecommerce.com  / Test123!');
  console.log('');
  console.log(`📂 Kategoriler: ${mockData.categories.length} adet`);
  console.log(`🛍️  Ürünler: ${productCount} ürün, ${variantCount} varyant`);
  console.log(`🖼️  Görseller: ${imageCount} adet`);
  console.log(`🏷️  Etiketler: ${tagCount} adet`);
  console.log(`🏢 Markalar: 4 adet`);
  console.log('');
  console.log('🎟️  Kuponlar:');
  console.log('   HOSGELDIN10 → %10 indirim (min. 500₺)');
  console.log('   CEYIZ15     → %15 indirim (min. 2000₺)');
  console.log('   INDIRIM100  → 100₺ indirim (min. 1000₺)');
  console.log('═══════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
