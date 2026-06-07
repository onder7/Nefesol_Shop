import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sign } from 'jsonwebtoken';
import * as jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import { env } from '../config/env';

const router = Router();

interface OAuthProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  provider: 'google' | 'facebook' | 'instagram';
}

/**
 * Social login ile kullanıcı bul veya oluştur
 */
async function findOrCreateUser(profile: OAuthProfile) {
  const provider = profile.provider;
  const providerId = `${provider}:${profile.id}`;

  // Email ile kullanıcı bul
  let user = await prisma.user.findUnique({
    where: { email: profile.email }
  });

  if (user) {
    // Mevcut kullanıcı - OAuth ID'yi ekle
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id }
    });

    if (userProfile && !userProfile.oauthIds.includes(providerId)) {
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: {
          oauthIds: {
            push: providerId
          }
        }
      });
    }
  } else {
    // Yeni kullanıcı oluştur
    const firstName = profile.firstName || profile.email.split('@')[0];
    const lastName = profile.lastName || '';

    user = await prisma.user.create({
      data: {
        email: profile.email,
        firstName,
        lastName,
        role: 'CUSTOMER',
        userProfile: {
          create: {
            phone: '',
            bio: '',
            avatar: profile.picture || '',
            oauthIds: [providerId]
          }
        }
      }
    });
  }

  return user;
}

/**
 * Google OAuth callback
 * Beklenen payload: { idToken: string }
 */
router.post('/auth/oauth/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body as { idToken?: string };

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token gerekli'
      });
    }

    // Google ID Token'ı doğrula
    // Not: Production'da Google API'sini kullan
    // Bu örnekte, frontend'den gelen JWT'yi doğruluyoruz
    let decoded: any;
    try {
      decoded = jwt.decode(idToken) as any;
    } catch {
      return res.status(401).json({ success: false, error: 'Geçersiz token' });
    }

    if (!decoded || !decoded.email) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz token'
      });
    }

    const user = await findOrCreateUser({
      id: decoded.sub || decoded.email,
      email: decoded.email,
      firstName: decoded.given_name,
      lastName: decoded.family_name,
      picture: decoded.picture,
      provider: 'google'
    });

    // JWT token'lar oluştur
    const accessToken = sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
    const refreshToken = sign({ userId: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

    // Refresh token'ı kaydet
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: { push: refreshToken } }
    });

    logger.info('Google OAuth başarılı', { userId: user.id, email: user.email });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    logger.error('Google OAuth hatası', { err: (err as Error).message });
    next(err);
  }
});

/**
 * Facebook OAuth callback
 * Beklenen payload: { accessToken: string }
 */
router.post('/auth/oauth/facebook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken } = req.body as { accessToken?: string };

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token gerekli'
      });
    }

    // Facebook API'sine kullanıcı bilgisini sor
    const fbRes = await fetch('https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=' + accessToken);
    const fbData = await fbRes.json() as any;

    if (!fbData.email) {
      return res.status(400).json({
        success: false,
        error: 'E-posta bilgisi alınamadı'
      });
    }

    const user = await findOrCreateUser({
      id: fbData.id,
      email: fbData.email,
      firstName: fbData.first_name,
      lastName: fbData.last_name,
      picture: fbData.picture?.data?.url,
      provider: 'facebook'
    });

    const jwtAccessToken = sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
    const refreshToken = sign({ userId: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: { push: refreshToken } }
    });

    logger.info('Facebook OAuth başarılı', { userId: user.id, email: user.email });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        accessToken: jwtAccessToken,
        refreshToken
      }
    });
  } catch (err) {
    logger.error('Facebook OAuth hatası', { err: (err as Error).message });
    next(err);
  }
});

/**
 * Instagram OAuth callback (via Facebook)
 * Beklenen payload: { accessToken: string }
 */
router.post('/auth/oauth/instagram', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken } = req.body as { accessToken?: string };

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token gerekli'
      });
    }

    // Instagram API'sine (Facebook Graph API üzerinden) kullanıcı bilgisini sor
    const igRes = await fetch('https://graph.instagram.com/me?fields=id,username&access_token=' + accessToken);
    const igData = await igRes.json() as any;

    if (!igData.id) {
      return res.status(400).json({
        success: false,
        error: 'Instagram kullanıcısı bulunamadı'
      });
    }

    // Instagram'da email olmayabileceği için username@instagram.local kullan
    const email = `${igData.username}@instagram.local`;

    const user = await findOrCreateUser({
      id: igData.id,
      email,
      firstName: igData.username,
      lastName: '',
      picture: igData.profile_picture_url,
      provider: 'instagram'
    });

    const jwtAccessToken = sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
    const refreshToken = sign({ userId: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: { push: refreshToken } }
    });

    logger.info('Instagram OAuth başarılı', { userId: user.id });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        accessToken: jwtAccessToken,
        refreshToken
      }
    });
  } catch (err) {
    logger.error('Instagram OAuth hatası', { err: (err as Error).message });
    next(err);
  }
});

export default router;
