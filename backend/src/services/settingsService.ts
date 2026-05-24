import { prisma } from '../config/database';
import { AppError } from '../types';

export interface ShippingConfig {
  shippingFee: number;
  freeShippingThreshold: number;
}

const DEFAULTS: ShippingConfig = {
  shippingFee: 49.9,
  freeShippingThreshold: 500,
};

export async function getShippingConfig(): Promise<ShippingConfig> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: ['shipping_fee', 'free_shipping_threshold'] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    shippingFee: map['shipping_fee'] !== undefined
      ? Number(map['shipping_fee'])
      : DEFAULTS.shippingFee,
    freeShippingThreshold: map['free_shipping_threshold'] !== undefined
      ? Number(map['free_shipping_threshold'])
      : DEFAULTS.freeShippingThreshold,
  };
}

export async function updateShippingConfig(fee: number, threshold: number): Promise<ShippingConfig> {
  await prisma.$transaction([
    prisma.siteSettings.upsert({
      where: { key: 'shipping_fee' },
      update: { value: String(fee) },
      create: { key: 'shipping_fee', value: String(fee) },
    }),
    prisma.siteSettings.upsert({
      where: { key: 'free_shipping_threshold' },
      update: { value: String(threshold) },
      create: { key: 'free_shipping_threshold', value: String(threshold) },
    }),
  ]);
  return { shippingFee: fee, freeShippingThreshold: threshold };
}

export function computeShipping(subtotal: number, config: ShippingConfig): number {
  return subtotal >= config.freeShippingThreshold ? 0 : config.shippingFee;
}

// ─── Generic Key-Value Settings ───────────────────────────────────────────────

export async function getSettingsGroup(prefix: string): Promise<Record<string, string>> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: prefix } },
  });
  return Object.fromEntries(rows.map((r) => [r.key.slice(prefix.length), r.value]));
}

export async function updateSettingsGroup(
  prefix: string,
  data: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  await prisma.$transaction(
    entries.map(([k, v]) =>
      prisma.siteSettings.upsert({
        where:  { key: prefix + k },
        update: { value: v },
        create: { key: prefix + k, value: v },
      }),
    ),
  );
}

// ─── Team Management ──────────────────────────────────────────────────────────

const SUB_ROLE_PREFIX = 'team_subrole_';

export async function listAdminUsers() {
  const [admins, subRoleRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.siteSettings.findMany({ where: { key: { startsWith: SUB_ROLE_PREFIX } } }),
  ]);

  const subRoleMap = Object.fromEntries(
    subRoleRows.map((r) => [r.key.slice(SUB_ROLE_PREFIX.length), r.value]),
  );

  return admins.map((u) => ({
    ...u,
    subRole: subRoleMap[u.id] ?? 'SUPER_ADMIN',
  }));
}

export async function updateTeamMember(
  userId: string,
  data: { subRole?: string; isActive?: boolean },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);

  await Promise.all([
    data.isActive !== undefined
      ? prisma.user.update({ where: { id: userId }, data: { isActive: data.isActive } })
      : Promise.resolve(),
    data.subRole !== undefined
      ? prisma.siteSettings.upsert({
          where: { key: SUB_ROLE_PREFIX + userId },
          update: { value: data.subRole },
          create: { key: SUB_ROLE_PREFIX + userId, value: data.subRole },
        })
      : Promise.resolve(),
  ]);
}

export async function inviteAdminUser(email: string, subRole: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Bu e-posta ile kayıtlı kullanıcı bulunamadı', 404);
  if (user.role === 'ADMIN') throw new AppError('Bu kullanıcı zaten admin', 409);

  await Promise.all([
    prisma.user.update({ where: { email }, data: { role: 'ADMIN' } }),
    prisma.siteSettings.upsert({
      where: { key: SUB_ROLE_PREFIX + user.id },
      update: { value: subRole },
      create: { key: SUB_ROLE_PREFIX + user.id, value: subRole },
    }),
  ]);

  return { ...user, role: 'ADMIN', subRole };
}

export async function removeAdminUser(userId: string, requesterId: string) {
  if (userId === requesterId) throw new AppError('Kendi hesabınızı düşüremezsiniz', 400);
  await prisma.user.update({ where: { id: userId }, data: { role: 'CUSTOMER' } });
}

// ─── Payment Methods ──────────────────────────────────────────────────────────

export interface PaymentMethodsConfig {
  card:   { enabled: boolean };
  cod:    { enabled: boolean; fee: number };
  havale: { enabled: boolean; bankName: string; iban: string; accountName: string; description: string };
}

export async function getPaymentMethods(): Promise<PaymentMethodsConfig> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: 'payment_' } },
  });
  const m = Object.fromEntries(rows.map((r) => [r.key.slice('payment_'.length), r.value]));

  return {
    card: {
      enabled: m['iyzico_enabled'] === 'true' || m['paytr_enabled'] === 'true',
    },
    cod: {
      enabled: m['cod_enabled'] === 'true',
      fee: m['cod_fee'] ? Number(m['cod_fee']) : 0,
    },
    havale: {
      enabled: m['havale_enabled'] === 'true',
      bankName:    m['havale_bank_name']    ?? '',
      iban:        m['havale_iban']         ?? '',
      accountName: m['havale_account_name'] ?? '',
      description: m['havale_description']  ?? '',
    },
  };
}

// ─── Maintenance Mode Settings ───────────────────────────────────────────────

export interface MaintenanceConfig {
  isActive: boolean;
  message: string;
}

export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: ['maintenance_mode', 'maintenance_message'] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    isActive: map['maintenance_mode'] === 'true',
    message: map['maintenance_message'] ?? 'Sistemimizde güncelleme yapılmaktadır, kısa süre sonra görüşmek üzere!',
  };
}

export async function updateMaintenanceConfig(isActive: boolean, message: string): Promise<MaintenanceConfig> {
  await prisma.$transaction([
    prisma.siteSettings.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: String(isActive) },
      create: { key: 'maintenance_mode', value: String(isActive) },
    }),
    prisma.siteSettings.upsert({
      where: { key: 'maintenance_message' },
      update: { value: message },
      create: { key: 'maintenance_message', value: message },
    }),
  ]);
  return { isActive, message };
}

