import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { AuthRequest } from '../types';
import { env } from '../config/env';

function getRootCookieDomain(): string | undefined {
  if (env.NODE_ENV !== 'production') return undefined;
  try {
    const hostname = new URL(env.FRONTEND_URL).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    return parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : undefined;
  } catch { return undefined; }
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  domain: getRootCookieDomain(),
};

function setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accessToken, refreshToken } = await authService.register(req.body);
    setTokenCookies(res, accessToken, refreshToken);
    res.status(201).json({
      success: true,
      message: 'Kayıt başarılı',
      data: { accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body) as any;

    // MFA gerekli mi?
    if (result.mfaRequired && result.tempToken) {
      res.json({
        success: true,
        mfaRequired: true,
        tempToken: result.tempToken,
        user: result.user,
      });
      return;
    }

    // Normal login
    setTokenCookies(res, result.accessToken, result.refreshToken);
    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user },
    });
  } catch (err) {
    next(err);
  }
}

export async function guestLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.guestLogin(req.body) as any;
    setTokenCookies(res, result.accessToken, result.refreshToken);
    res.json({
      success: true,
      message: 'Misafir girişi başarılı',
      data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.id) await authService.logout(req.user.id);
    res.clearCookie('access_token', COOKIE_OPTS);
    res.clearCookie('refresh_token', COOKIE_OPTS);
    res.json({ success: true, message: 'Çıkış yapıldı' });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refresh_token ?? req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token bulunamadı' });
      return;
    }
    const tokens = await authService.refreshTokens(token);
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ success: true, data: { accessToken: tokens.accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    res.json({ success: true, message: 'Şifre değiştirildi' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email);
    // Güvenlik: kullanıcı var ya da yok, aynı mesajı döndür
    res.json({ success: true, message: 'Eğer bu e-posta kayıtlıysa şifre sıfırlama linki gönderildi' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, message: 'Şifreniz başarıyla sıfırlandı' });
  } catch (err) {
    next(err);
  }
}
