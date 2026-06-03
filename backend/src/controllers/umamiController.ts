import { Request, Response, NextFunction } from 'express';

const UMAMI_URL = (process.env.UMAMI_INTERNAL_URL ?? 'http://umami:3000/analytics').replace(/\/$/, '');
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID ?? '';
const UMAMI_USERNAME = process.env.UMAMI_USERNAME ?? 'admin';
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD ?? 'umami';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${UMAMI_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Umami auth failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { token: string };
  cachedToken = json.token;
  tokenExpiry = Date.now() + 20 * 60 * 1000;
  return cachedToken!;
}

export async function getLiveAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    if (!UMAMI_WEBSITE_ID) {
      return res.json({ success: true, data: null });
    }

    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}` };

    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startAt = startOfDay.getTime();

    const base = `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}`;

    const [activeRes, statsRes, pagesRes, countriesRes] = await Promise.all([
      fetch(`${base}/active`, { headers }),
      fetch(`${base}/stats?startAt=${startAt}&endAt=${now}`, { headers }),
      fetch(`${base}/metrics?type=url&startAt=${startAt}&endAt=${now}&limit=5`, { headers }),
      fetch(`${base}/metrics?type=country&startAt=${startAt}&endAt=${now}&limit=5`, { headers }),
    ]);

    const [active, stats, pages, countries] = await Promise.all([
      activeRes.json().catch(() => ({})),
      statsRes.json().catch(() => ({})),
      pagesRes.json().catch(() => []),
      countriesRes.json().catch(() => []),
    ]);

    res.json({
      success: true,
      data: {
        activeVisitors: (active as Record<string, number>)?.x ?? 0,
        todayPageviews: (stats as Record<string, { value: number }>)?.pageviews?.value ?? 0,
        todayVisitors: (stats as Record<string, { value: number }>)?.visitors?.value ?? 0,
        topPages: Array.isArray(pages) ? pages as Array<{ x: string; y: number }> : [],
        topCountries: Array.isArray(countries) ? countries as Array<{ x: string; y: number }> : [],
      },
    });
  } catch (err) {
    next(err);
  }
}
