const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.siteSettings.upsert({
    where: { key: 'maintenance_mode' },
    update: { value: 'false' },
    create: { key: 'maintenance_mode', value: 'false' },
  });
  console.log('Maintenance mode has been successfully disabled in the database.');
  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
