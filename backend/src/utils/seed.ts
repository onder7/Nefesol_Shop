import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed başlıyor...');

  // Admin kullanıcı
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      email: 'admin@ecommerce.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      profile: {
        create: { firstName: 'Admin', lastName: 'User' },
      },
    },
  });
  console.log(`Admin: ${admin.email}`);

  // Test müşterisi
  const customerHash = await bcrypt.hash('Test123!', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'test@ecommerce.com' },
    update: {},
    create: {
      email: 'test@ecommerce.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      profile: {
        create: { firstName: 'Test', lastName: 'Kullanıcı' },
      },
    },
  });
  console.log(`Müşteri: ${customer.email}`);

  // Markalar
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { slug: 'apple' },
      update: {},
      create: { name: 'Apple', slug: 'apple' },
    }),
    prisma.brand.upsert({
      where: { slug: 'samsung' },
      update: {},
      create: { name: 'Samsung', slug: 'samsung' },
    }),
    prisma.brand.upsert({
      where: { slug: 'nike' },
      update: {},
      create: { name: 'Nike', slug: 'nike' },
    }),
  ]);
  console.log(`${brands.length} marka eklendi`);

  // Ana kategoriler
  const elektronik = await prisma.category.upsert({
    where: { slug: 'elektronik' },
    update: {},
    create: { name: 'Elektronik', slug: 'elektronik', sortOrder: 1 },
  });
  const giyim = await prisma.category.upsert({
    where: { slug: 'giyim' },
    update: {},
    create: { name: 'Giyim', slug: 'giyim', sortOrder: 2 },
  });

  // Alt kategoriler
  const telefon = await prisma.category.upsert({
    where: { slug: 'telefon' },
    update: {},
    create: { name: 'Telefon', slug: 'telefon', parentId: elektronik.id, sortOrder: 1 },
  });
  const laptop = await prisma.category.upsert({
    where: { slug: 'laptop' },
    update: {},
    create: { name: 'Laptop', slug: 'laptop', parentId: elektronik.id, sortOrder: 2 },
  });
  const erkek = await prisma.category.upsert({
    where: { slug: 'erkek-giyim' },
    update: {},
    create: { name: 'Erkek Giyim', slug: 'erkek-giyim', parentId: giyim.id, sortOrder: 1 },
  });
  console.log('Kategoriler eklendi');

  // Ürünler
  const iphone = await prisma.product.upsert({
    where: { slug: 'iphone-15-pro' },
    update: {},
    create: {
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'Apple iPhone 15 Pro, titanyum gövde, A17 Pro çip.',
      categoryId: telefon.id,
      brandId: brands[0].id, // Apple
      variants: {
        create: [
          { sku: 'IPH15P-128-BLK', price: 59999, stockQty: 50, attributes: { renk: 'Siyah Titanyum', depolama: '128GB' } },
          { sku: 'IPH15P-256-BLK', price: 64999, stockQty: 30, attributes: { renk: 'Siyah Titanyum', depolama: '256GB' } },
          { sku: 'IPH15P-256-WHT', price: 64999, stockQty: 20, attributes: { renk: 'Beyaz Titanyum', depolama: '256GB' } },
        ],
      },
      tags: { create: [{ tag: 'telefon' }, { tag: 'apple' }, { tag: 'ios' }] },
    },
  });

  const galaxy = await prisma.product.upsert({
    where: { slug: 'samsung-galaxy-s24' },
    update: {},
    create: {
      name: 'Samsung Galaxy S24',
      slug: 'samsung-galaxy-s24',
      description: 'Samsung Galaxy S24, Snapdragon 8 Gen 3, 50MP kamera.',
      categoryId: telefon.id,
      brandId: brands[1].id, // Samsung
      variants: {
        create: [
          { sku: 'SGS24-128-PHT', price: 34999, stockQty: 40, attributes: { renk: 'Phantom Black', depolama: '128GB' } },
          { sku: 'SGS24-256-PHT', price: 39999, stockQty: 25, attributes: { renk: 'Phantom Black', depolama: '256GB' } },
        ],
      },
      tags: { create: [{ tag: 'telefon' }, { tag: 'samsung' }, { tag: 'android' }] },
    },
  });

  await prisma.product.upsert({
    where: { slug: 'nike-air-max-270' },
    update: {},
    create: {
      name: 'Nike Air Max 270',
      slug: 'nike-air-max-270',
      description: 'Nike Air Max 270 erkek spor ayakkabı.',
      categoryId: erkek.id,
      brandId: brands[2].id, // Nike
      variants: {
        create: [
          { sku: 'NAM270-40-BLK', price: 3499, stockQty: 15, attributes: { beden: '40', renk: 'Siyah' } },
          { sku: 'NAM270-41-BLK', price: 3499, stockQty: 18, attributes: { beden: '41', renk: 'Siyah' } },
          { sku: 'NAM270-42-BLK', price: 3499, stockQty: 12, attributes: { beden: '42', renk: 'Siyah' } },
          { sku: 'NAM270-43-WHT', price: 3499, stockQty: 10, attributes: { beden: '43', renk: 'Beyaz' } },
        ],
      },
      tags: { create: [{ tag: 'ayakkabı' }, { tag: 'nike' }, { tag: 'spor' }] },
    },
  });
  console.log('Ürünler eklendi');

  // İndirim kuponu
  await prisma.discount.upsert({
    where: { code: 'HOSGELDIN10' },
    update: {},
    create: {
      code: 'HOSGELDIN10',
      type: 'PERCENT',
      value: 10,
      minOrder: 500,
      maxUses: 1000,
      isActive: true,
    },
  });
  await prisma.discount.upsert({
    where: { code: 'INDIRIM100' },
    update: {},
    create: {
      code: 'INDIRIM100',
      type: 'FIXED',
      value: 100,
      minOrder: 1000,
      maxUses: 500,
      isActive: true,
    },
  });
  console.log('İndirim kuponları eklendi');

  // Test değerlendirmesi
  const variant = await prisma.productVariant.findFirst({ where: { productId: iphone.id } });
  if (variant) {
    await prisma.review.upsert({
      where: { productId_userId: { productId: iphone.id, userId: customer.id } },
      update: {},
      create: {
        productId: iphone.id,
        userId: customer.id,
        rating: 5,
        title: 'Mükemmel telefon',
        body: 'iPhone 15 Pro gerçekten harika bir telefon. Kamera kalitesi üstün.',
        isApproved: true,
      },
    });
  }

  console.log('\n✅ Seed tamamlandı!');
  console.log('─────────────────────────────────');
  console.log('Admin   → admin@ecommerce.com / Admin123!');
  console.log('Müşteri → test@ecommerce.com  / Test123!');
  console.log('Kuponlar → HOSGELDIN10 (%10) | INDIRIM100 (100₺)');
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
