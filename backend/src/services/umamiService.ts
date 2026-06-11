import { getSettingsGroup } from './settingsService';

// ─── Umami Analytics Entegrasyonu ─────────────────────────────────────────────
// Yapılandırma önceliği: Sistem Ayarları (analytics_* anahtarları) > env.
// URL + Website ID girilmediği sürece tüm fonksiyonlar null döner ve
// çağıran taraf demo veriye düşer.

export interface UmamiConfig {
  url: string;       // ör. https://analytics.nefesol.net
  websiteId: string;
  username: string;
  password: string;
}

export async function getUmamiConfig(): Promise<UmamiConfig | null> {
  let s: Record<string, string> = {};
  try {
    s = await getSettingsGroup('analytics_');
  } catch {
    // DB erişilemiyorsa env'e düş
  }

  const url = (s['umami_url'] || process.env.UMAMI_INTERNAL_URL || '').trim().replace(/\/+$/, '');
  const websiteId = (s['umami_website_id'] || process.env.UMAMI_WEBSITE_ID || '').trim();
  const username = (s['umami_username'] || process.env.UMAMI_USERNAME || '').trim();
  const password = s['umami_password'] || process.env.UMAMI_PASSWORD || '';

  if (!url || !websiteId) return null;
  return { url, websiteId, username, password };
}

// Frontend izleme script'i için public kısım — kimlik bilgisi İÇERMEZ
export async function getPublicUmamiConfig(): Promise<{ url: string; websiteId: string } | null> {
  const cfg = await getUmamiConfig();
  if (!cfg) return null;
  return { url: cfg.url, websiteId: cfg.websiteId };
}

// ─── API istemcisi ────────────────────────────────────────────────────────────

let cachedToken: { key: string; token: string; expiry: number } | null = null;

async function getToken(cfg: UmamiConfig): Promise<string> {
  const key = `${cfg.url}|${cfg.username}`;
  if (cachedToken && cachedToken.key === key && Date.now() < cachedToken.expiry) {
    return cachedToken.token;
  }

  const res = await fetch(`${cfg.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Umami auth failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { token: string };
  cachedToken = { key, token: json.token, expiry: Date.now() + 20 * 60 * 1000 };
  return json.token;
}

async function umamiGet<T>(cfg: UmamiConfig, path: string): Promise<T> {
  const token = await getToken(cfg);
  const res = await fetch(`${cfg.url}/api/websites/${cfg.websiteId}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Umami API failed (${res.status}) ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface UmamiStatValue { value: number; prev?: number }

export interface UmamiStats {
  pageviews: UmamiStatValue;
  visitors: UmamiStatValue;
  visits: UmamiStatValue;
  bounces: UmamiStatValue;
  totaltime: UmamiStatValue;
}

export interface UmamiMetric { x: string | null; y: number }

export type UmamiMetricType =
  | 'url' | 'referrer' | 'browser' | 'os' | 'device' | 'country' | 'event';

// ─── Sorgular ─────────────────────────────────────────────────────────────────

export function fetchStats(cfg: UmamiConfig, startAt: number, endAt: number) {
  return umamiGet<UmamiStats>(cfg, `/stats?startAt=${startAt}&endAt=${endAt}`);
}

export function fetchActive(cfg: UmamiConfig) {
  return umamiGet<{ x: number } | Array<{ x: number }>>(cfg, '/active');
}

export function fetchMetrics(
  cfg: UmamiConfig,
  type: UmamiMetricType,
  startAt: number,
  endAt: number,
  limit = 10,
) {
  return umamiGet<UmamiMetric[]>(
    cfg,
    `/metrics?type=${type}&startAt=${startAt}&endAt=${endAt}&limit=${limit}`,
  );
}
