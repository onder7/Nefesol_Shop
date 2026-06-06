const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('👤 Admin kullanıcısı oluşturuluyor...');

    // Parolayı hash'le
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    // Admin kullanıcısını oluştur
    const admin = await prisma.users.create({
      data: {
        email: 'admin@ecommerce.com',
        passwordHash: passwordHash,
        role: 'ADMIN',
        userProfile: {
          create: {
            firstName: 'Admin',
            lastName: 'User',
          },
        },
      },
      include: {
        userProfile: true,
      },
    });

    console.log('✅ Admin kullanıcısı oluşturuldu!');
    console.log(`
📧 Email: ${admin.email}
🔐 Parola: Admin123!
👤 Ad: ${admin.userProfile.firstName} ${admin.userProfile.lastName}
🎯 Rol: ${admin.role}
    `);

  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  Admin kullanıcısı zaten var!');
    } else {
      console.error('❌ Hata:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
