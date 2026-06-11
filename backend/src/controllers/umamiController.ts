import { Request, Response, NextFunction } from 'express';
import { getUmamiConfig, fetchActive, fetchStats, fetchMetrics } from '../services/umamiService';

export async function getLiveAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const cfg = await getUmamiConfig();
    if (!cfg) {
      // Umami yapılandırılmamış (Sistem Ayarları → Analytics)
      return res.json({ success: true, data: null });
    }

    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startAt = startOfDay.getTime();

    const [active, stats, pages, countries] = await Promise.all([
      fetchActive(cfg).catch(() => null),
      fetchStats(cfg, startAt, now).catch(() => null),
      fetchMetrics(cfg, 'url', startAt, now, 5).catch(() => []),
      fetchMetrics(cfg, 'country', startAt, now, 5).catch(() => []),
    ]);

    // /active bazı sürümlerde { x } bazılarında [{ x }] döner
    const activeVisitors = Array.isArray(active)
      ? (active[0]?.x ?? 0)
      : (active?.x ?? 0);

    res.json({
      success: true,
      data: {
        activeVisitors,
        todayPageviews: stats?.pageviews?.value ?? 0,
        todayVisitors: stats?.visitors?.value ?? 0,
        topPages: Array.isArray(pages) ? pages : [],
        topCountries: Array.isArray(countries) ? countries : [],
      },
    });
  } catch (err) {
    next(err);
  }
}
