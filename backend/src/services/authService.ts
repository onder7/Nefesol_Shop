import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../types';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent?: boolean; // e-posta izni
  smsConsent?: boolean;
  acceptTerms?: boolean; // üyelik koşulları + KVKK (zorunlu)
}

interface LoginInput {
  email: string;
  password: string;
}

export interface GuestLoginInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent?: boolean;
  smsConsent?: boolean;
  acceptTerms?: boolean;
}

function signAccess(userId: string, email: string, role: string): string {
  return jwt.sign({ id: userId, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function signRefresh(userId: string): string {
  return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
  await redis.setex(`refresh:${userId}`, ttlSeconds, token);
}

async function revokeRefreshToken(userId: string): Promise<void> {
  await redis.del(`refresh:${userId}`);
}

export async function register(input: RegisterInput): Promise<TokenPair> {
  if (!input.acceptTerms) {
    throw new AppError('Üyelik koşullarını ve kişisel verilerin korunmasını kabul etmelisiniz', 400);
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email }, include: { profile: true } });

  const hashed = await bcrypt.hash(input.password, 12);
  let user;

  if (existing) {
    if (!existing.isGuest) {
      throw new AppError('Bu e-posta adresi zaten kayıtlı', 409);
    }
    // Guest hesabını gerçek hesaba dönüştür
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: hashed,
        isGuest: false,
        marketingConsent: input.marketingConsent ?? existing.marketingConsent,
        smsConsent: input.smsConsent ?? existing.smsConsent,
        termsAcceptedAt: new Date(),
        profile: {
          update: {
            firstName: input.firstName || existing.profile?.firstName,
            lastName: input.lastName || existing.profile?.lastName,
            phone: input.phone || existing.profile?.phone,
          }
        }
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hashed,
        role: 'CUSTOMER',
        isGuest: false,
        marketingConsent: input.marketingConsent ?? false,
        smsConsent: input.smsConsent ?? false,
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
          },
        },
      },
    });
  }

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken };
}

export async function guestLogin(input: GuestLoginInput): Promise<(TokenPair & { user: object })> {
  if (!input.acceptTerms) {
    throw new AppError('Üyelik koşullarını ve kişisel verilerin korunmasını kabul etmelisiniz', 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    include: { profile: true },
  });

  let user;

  if (existing) {
    // Şifresi olan kullanıcı gerçek üyedir, misafir girişine izin verme
    if (existing.passwordHash) {
      throw new AppError('Bu e-posta adresi ile kayıtlı bir hesap var. Lütfen üye girişi yapınız.', 409);
    }
    // Misafiri düzelt + onayları güncelle
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        isGuest: true,
        marketingConsent: input.marketingConsent ?? existing.marketingConsent,
        smsConsent: input.smsConsent ?? existing.smsConsent,
        termsAcceptedAt: new Date(),
      },
      include: { profile: true },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: input.email,
        role: 'CUSTOMER',
        isGuest: true,
        marketingConsent: input.marketingConsent ?? false,
        smsConsent: input.smsConsent ?? false,
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
          },
        },
      },
      include: { profile: true },
    });
  }

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { 
    accessToken, 
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isGuest: true,
      profile: user.profile,
    }
  };
}

export async function login(input: LoginInput): Promise<(TokenPair & { user: object; mfaRequired?: boolean; tempToken?: string }) | any> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { profile: true },
  });

  if (!user || !user.isActive) throw new AppError('E-posta veya şifre hatalı', 401);

  if (!user.passwordHash) throw new AppError('Bu hesap sosyal giriş ile oluşturulmuş, şifre ile giriş yapılamaz', 401);

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AppError('E-posta veya şifre hatalı', 401);

  // MFA kontrol et
  const userAny = user as any;
  if (userAny.mfaEnabled || userAny.mfa_enabled) {
    // Geçici token oluştur (MFA doğrulaması için)
    const tempToken = jwt.sign({ id: user.id, mfaRequired: true }, env.JWT_SECRET as string, {
      expiresIn: '5m', // 5 dakika geçerli
    });

    return {
      mfaRequired: true,
      tempToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        phone: user.profile?.phone,
        avatarUrl: user.profile?.avatarUrl,
      },
    },
  };
}

export async function refreshTokens(token: string): Promise<TokenPair> {
  let payload: { id: string };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
  } catch {
    throw new AppError('Geçersiz refresh token', 401);
  }

  const stored = await redis.get(`refresh:${payload.id}`);
  if (!stored || stored !== token) throw new AppError('Refresh token geçersiz veya iptal edilmiş', 401);

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive) throw new AppError('Kullanıcı bulunamadı', 401);

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken };
}

export async function logout(userId: string): Promise<void> {
  await revokeRefreshToken(userId);
}

export async function getMe(userId: string): Promise<object> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    hasPassword: !!user.passwordHash, // sosyal girişli hesapta false → "Şifre Belirle"
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phone: user.profile.phone,
          avatarUrl: user.profile.avatarUrl,
        }
      : null,
  };
}

/**
 * Sosyal girişle oluşmuş (şifresiz) hesap için ilk şifreyi belirler.
 * Hesabın zaten şifresi varsa reddeder (o durumda changePassword kullanılmalı).
 */
export async function setPassword(userId: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
  if (user.passwordHash) {
    throw new AppError('Hesabınızda zaten şifre var. Şifre değiştirmeyi kullanın.', 400);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
}

export async function updateProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string },
) {
  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return getMe(userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);

  if (!user.passwordHash) throw new AppError('Bu hesap sosyal giriş ile oluşturulmuş, şifre değiştirilemiyor', 400);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Mevcut şifre hatalı', 400);

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
  await revokeRefreshToken(userId);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Güvenlik: kullanıcı bulunamasa da hata vermiyoruz
  if (!user) return;

  const token = crypto.randomUUID();
  await redis.setex(`reset:${token}`, 60 * 60, user.id); // 1 saat TTL

  // SMTP yoksa token'ı logla (geliştirme için)
  const { sendPasswordResetEmail } = await import('./emailService');
  await sendPasswordResetEmail(email, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await redis.get(`reset:${token}`);
  if (!userId) throw new AppError('Şifre sıfırlama linki geçersiz veya süresi dolmuş', 400);

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
  await redis.del(`reset:${token}`);
  await revokeRefreshToken(userId);
}
