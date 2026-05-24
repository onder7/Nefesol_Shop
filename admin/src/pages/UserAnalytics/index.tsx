import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { api } from '../../lib/api';

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KPICard({
  title,
  value,
  change,
  icon,
  live,
}: {
  title: string;
  value: string;
  change?: string;
  changeUp?: boolean;
  icon: React.ReactNode;
  live?: boolean;
}) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(id);
  }, [live]);

  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
          {icon}
        </div>
        {change && (
          <span className="flex items-center gap-1 text-sm font-medium text-meta-3">
            <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
              <path
                d="M4.35716 2.47737L0.908974 5.82987L5.0443e-07 4.94612L5 0.0848689L10 4.94612L9.09103 5.82987L5.64284 2.47737L5.64284 10.0849L4.35716 10.0849L4.35716 2.47737Z"
                fill="currentColor"
              />
            </svg>
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h4 className="text-2xl font-bold text-black dark:text-white">{value}</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-black dark:text-white">{title}</span>
          {live && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full bg-meta-3 transition-opacity duration-500 ${
                  pulse ? 'opacity-100' : 'opacity-30'
                }`}
              />
              <span className="text-xs font-bold text-meta-3 tracking-wide">CANLI</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DeviceBar                                                          */
/* ------------------------------------------------------------------ */

function DeviceBar({
  icon,
  label,
  pct,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
  color: string;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="flex items-center gap-3">
      <div className="text-body dark:text-bodydark">{icon}</div>
      <div className="flex-1">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium text-black dark:text-white">{label}</span>
          <span className="font-bold text-black dark:text-white">{pct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-stroke dark:bg-strokedark">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${width}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

interface UserAnalyticsData {
  kpi: {
    totalCartValue: number;
    totalSubscribers: number;
    totalFavorites: number;
  };
  favorites: Array<{
    id: string;
    image: string;
    name: string;
    sku: string;
    count: number;
  }>;
  cartUsers: Array<{
    id: string;
    name: string;
    email: string;
    items: number;
    total: number;
    updatedAt: string;
  }>;
  subscribers: Array<{
    id: string;
    email: string;
    date: string;
    status: 'confirmed' | 'pending';
  }>;
  trafficSources: Array<{
    label: string;
    value: number;
  }>;
  deviceDistribution: {
    mobile: number;
    desktop: number;
  };
}

export default function UserAnalytics() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'subscribers'>('analytics');
  const [subFilter, setSubFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [liveCount, setLiveCount] = useState(127);
  const [data, setData] = useState<UserAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for manual subscriber addition
  const [newEmail, setNewEmail] = useState('');
  const [newStatus, setNewStatus] = useState<'confirmed' | 'pending'>('confirmed');
  const [adding, setAdding] = useState(false);

  // Fetch real analytics data
  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    api.get<any>('/admin/user-analytics')
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setError(null);
        } else {
          setError('İstatistik verileri yüklenemedi.');
        }
      })
      .catch((err) => {
        console.error('Analytics load error:', err);
        setError('Sunucu bağlantısı kurulamadı.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Simulate fluctuating live visitor count
  useEffect(() => {
    const id = setInterval(() => {
      setLiveCount((c) => Math.max(80, c + Math.floor(Math.random() * 11) - 5));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Recalculated states
  const filteredSubs = useMemo(() => {
    const list = data?.subscribers ?? [];
    return list.filter((s) => (subFilter === 'all' ? true : s.status === subFilter));
  }, [data, subFilter]);

  const maxFav = useMemo(() => {
    const counts = (data?.favorites ?? []).map((f) => f.count);
    return counts.length > 0 ? Math.max(...counts) : 1;
  }, [data]);

  const totalConfirmedSubs = useMemo(() => {
    return (data?.subscribers ?? []).filter((s) => s.status === 'confirmed').length;
  }, [data]);

  // Action: Toggle subscriber status
  const handleToggleStatus = async (id: string) => {
    try {
      const res = await api.put<any>(`/admin/newsletter/subscribers/${id}/toggle-status`, {});
      if (res.success) {
        setData((prev) => {
          if (!prev) return null;
          const updated = prev.subscribers.map((s) =>
            s.id === id ? { ...s, status: s.status === 'confirmed' ? 'pending' : 'confirmed' } : s
          );
          return {
            ...prev,
            subscribers: updated,
          };
        });
      }
    } catch (err) {
      console.error('Failed to toggle subscriber status:', err);
      alert('Durum güncellenirken hata oluştu.');
    }
  };

  // Action: Delete subscriber
  const handleDeleteSubscriber = async (id: string) => {
    if (!window.confirm('Bu aboneyi listeden silmek istediğinize emin misiniz?')) return;
    try {
      const res = await api.delete<any>(`/admin/newsletter/subscribers/${id}`);
      if (res.success) {
        setData((prev) => {
          if (!prev) return null;
          const updated = prev.subscribers.filter((s) => s.id !== id);
          return {
            ...prev,
            subscribers: updated,
            kpi: {
              ...prev.kpi,
              totalSubscribers: Math.max(0, prev.kpi.totalSubscribers - 1),
            },
          };
        });
      }
    } catch (err) {
      console.error('Failed to delete subscriber:', err);
      alert('Abone silinirken hata oluştu.');
    }
  };

  // Action: Add subscriber manual
  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const res = await api.post<any>('/admin/newsletter/subscribers', {
        email: newEmail.trim(),
        status: newStatus,
      });
      if (res.success) {
        setNewEmail('');
        fetchAnalytics(); // reload to get new details and counts
      }
    } catch (err: any) {
      console.error('Failed to add subscriber:', err);
      alert(err.message || 'Abone eklenirken hata oluştu.');
    } finally {
      setAdding(false);
    }
  };

  const handleCsvDownload = useCallback(() => {
    const rows = [
      ['E-posta', 'Kayıt Tarihi', 'Durum'],
      ...filteredSubs.map((s) => [s.email, s.date, s.status === 'confirmed' ? 'Onaylı' : 'Onaysız']),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulten_aboneleri.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredSubs]);

  // Donut Chart dynamic config
  const donutOptions = useMemo<ApexOptions>(() => {
    const sources = data?.trafficSources ?? [];
    return {
      chart: { type: 'donut', height: 280 },
      labels: sources.map((s) => s.label),
      legend: { position: 'bottom', fontSize: '13px' },
      dataLabels: { enabled: true, formatter: (val: number) => val.toFixed(0) + '%' },
      colors: ['#3C50E0', '#0FADCF', '#F472B6', '#FFBA00'],
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Toplam Trafik',
                formatter: () => '100%',
              },
            },
          },
        },
      },
      responsive: [{ breakpoint: 480, options: { chart: { height: 240 }, legend: { position: 'bottom' } } }],
    };
  }, [data]);

  const donutSeries = useMemo(() => {
    return (data?.trafficSources ?? []).map((s) => s.value);
  }, [data]);

  const deviceDistribution = data?.deviceDistribution ?? { mobile: 75, desktop: 25 };

  if (loading) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[350px] w-full flex-col items-center justify-center rounded-sm border border-stroke bg-white p-6 text-center dark:border-strokedark dark:bg-boxdark">
        <svg className="h-12 w-12 text-danger mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-bold text-black dark:text-white mb-2">Hata Oluştu</h3>
        <p className="text-sm text-body mb-4">{error || 'Veriler yüklenirken bilinmeyen bir hata meydana geldi.'}</p>
        <button onClick={fetchAnalytics} className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90">
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Kullanıcı İstatistikleri
          </h2>
          <p className="mt-0.5 text-sm text-body">
            Gerçek zamanlı kullanıcı davranışları, sepet analizi ve bülten üyelikleri yönetimi
          </p>
        </div>
        <p className="text-xs text-bodydark2">
          Son güncelleme: {new Date().toLocaleString('tr-TR')}
        </p>
      </div>

      {/* ── Tabs Bar ── */}
      <div className="mb-6 flex border-b border-stroke dark:border-strokedark">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-primary text-primary'
              : 'border-transparent text-body hover:text-primary'
          }`}
        >
          Kullanıcı Analizleri & İstatistikler
        </button>
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'subscribers'
              ? 'border-primary text-primary'
              : 'border-transparent text-body hover:text-primary'
          }`}
        >
          Bülten Aboneleri ({data.kpi.totalSubscribers})
        </button>
      </div>

      {/* ═══════ TAB 1 — ANALYTICS VIEW ═══════ */}
      {activeTab === 'analytics' && (
        <>
          {/* ── KPI Cards ── */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard
              title="Anlık Canlı Ziyaretçi"
              value={liveCount.toLocaleString('tr-TR')}
              live
              icon={
                <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
            <KPICard
              title="Sepette Bekleyen Değer"
              value={`₺${(data.kpi.totalCartValue ?? 0).toLocaleString('tr-TR')}`}
              icon={
                <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.17 14.75L7.2 14.6l.9-1.6H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0021.46 4H5.21L4.27 2H1v2h2l3.6 7.59L5.25 14c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.21z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
            <KPICard
              title="Bülten Abonesi"
              value={(data.kpi.totalSubscribers ?? 0).toLocaleString('tr-TR')}
              icon={
                <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
            <KPICard
              title="Favoriye Ekleme"
              value={(data.kpi.totalFavorites ?? 0).toLocaleString('tr-TR')}
              icon={
                <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
          </div>

          {/* ── Favorites & Cart Grid ── */}
          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* En Çok Favorilenenler */}
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
                <div>
                  <h3 className="text-base font-semibold text-black dark:text-white">
                    En Çok Favorilenenler
                  </h3>
                  <p className="mt-0.5 text-xs text-bodydark2">Tüm zamanların en beğenilen ürünleri</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Top 5
                </span>
              </div>
              <div className="divide-y divide-stroke dark:divide-strokedark">
                {data.favorites.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-2 dark:hover:bg-meta-4"
                  >
                    <span className="w-5 text-center text-xs font-bold text-bodydark2">{i + 1}</span>
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray dark:bg-meta-4">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-black dark:text-white">{item.name}</p>
                      <p className="font-mono text-[11px] text-bodydark2">SKU: {item.sku}</p>
                    </div>
                    <div className="flex w-32 flex-shrink-0 items-center gap-2.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${(item.count / maxFav) * 100}%` }}
                        />
                      </div>
                      <span className="min-w-[32px] text-right text-xs font-bold text-black dark:text-white">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}

                {data.favorites.length === 0 && (
                  <div className="py-12 text-center text-sm text-bodydark2">
                    Henüz favorilenen ürün bulunamadı.
                  </div>
                )}
              </div>
            </div>

            {/* Sepette Bekleyenler */}
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
                <div>
                  <h3 className="text-base font-semibold text-black dark:text-white">
                    Sepette Bekleyenler
                  </h3>
                  <p className="mt-0.5 text-xs text-bodydark2">Terk edilme riski olan aktif sepetler</p>
                </div>
                <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                  {data.cartUsers.length} sepet
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 dark:border-strokedark dark:bg-meta-4">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-bodydark2">
                        Müşteri
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-bodydark2">
                        Ürün
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-bodydark2">
                        Tutar
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-bodydark2">
                        Son Aktivite
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-bodydark2">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {data.cartUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="transition-colors hover:bg-gray-2 dark:hover:bg-meta-4/30"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-black dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-bodydark2">{u.email}</p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {u.items}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-black dark:text-white">
                          ₺{u.total.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-bodydark2">{u.updatedAt}</td>
                        <td className="px-4 py-3 text-right">
                          <button className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-opacity-90">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            Hatırlat
                          </button>
                        </td>
                      </tr>
                    ))}

                    {data.cartUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-sm text-bodydark2">
                          Sepette bekleyen aktif sepet bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Traffic & Devices ── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
                <h3 className="text-base font-semibold text-black dark:text-white">Trafik Kaynakları</h3>
                <p className="mt-0.5 text-xs text-bodydark2">Siteye giriş kanalları</p>
              </div>
              <div className="p-5">
                {donutSeries.length > 0 ? (
                  <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={280} />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-bodydark2">
                    Trafik verisi bulunamadı.
                  </div>
                )}

                <div className="mt-6 border-t border-stroke pt-5 dark:border-strokedark">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-bodydark2">
                    Cihaz Dağılımı
                  </p>
                  <div className="space-y-4">
                    <DeviceBar
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99z" />
                        </svg>
                      }
                      label="Mobil"
                      pct={deviceDistribution.mobile}
                      color="#3C50E0"
                    />
                    <DeviceBar
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                      }
                      label="Masaüstü"
                      pct={deviceDistribution.desktop}
                      color="#0FADCF"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick overview of Newsletter stats */}
            <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-black dark:text-white border-b border-stroke pb-4 mb-4 dark:border-strokedark">
                  Bülten Aboneliği Özet Bilgileri
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded bg-gray-2 p-4 text-center dark:bg-meta-4">
                    <span className="text-xs text-bodydark2 block mb-1">Onaylı Aboneler</span>
                    <span className="text-xl font-bold text-meta-3">{totalConfirmedSubs}</span>
                  </div>
                  <div className="rounded bg-gray-2 p-4 text-center dark:bg-meta-4">
                    <span className="text-xs text-bodydark2 block mb-1">Bekleyen Aboneler</span>
                    <span className="text-xl font-bold text-warning">
                      {data.kpi.totalSubscribers - totalConfirmedSubs}
                    </span>
                  </div>
                </div>
                <p className="mt-6 text-sm text-body leading-relaxed">
                  Bülten abonelerinize yeni gelen ürünler, özel gün indirimleri ve sezon kampanyaları hakkında otomatik veya manuel bilgilendirici e-postalar gönderebilirsiniz. 
                </p>
              </div>
              <button
                onClick={() => setActiveTab('subscribers')}
                className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded bg-primary py-3 text-sm font-medium text-white transition hover:bg-opacity-95"
              >
                Aboneleri Yönetmeye Git →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════ TAB 2 — NEWSLETTER SUBSCRIBERS VIEW ═══════ */}
      {activeTab === 'subscribers' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left Side: Add Subscriber Form */}
          <div className="xl:col-span-1 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-semibold text-black dark:text-white">Yeni Abone Ekle</h3>
              <p className="mt-0.5 text-xs text-bodydark2">Veritabanına manuel e-posta abonesi tanımlayın</p>
            </div>
            <form onSubmit={handleAddSubscriber} className="p-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-4 py-2.5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  disabled={adding}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Abonelik Durumu
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'confirmed' | 'pending')}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-4 py-2.5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  disabled={adding}
                >
                  <option value="confirmed">Onaylı (Confirmed)</option>
                  <option value="pending">Onay Bekliyor (Pending)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={adding || !newEmail}
                className="flex w-full justify-center rounded bg-primary p-3 font-medium text-white hover:bg-opacity-90 disabled:bg-opacity-50"
              >
                {adding ? 'Ekleniyor...' : 'Abone Ekle'}
              </button>
            </form>
          </div>

          {/* Right Side: Subscribers List with management controls */}
          <div className="xl:col-span-2 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-black dark:text-white">Kayıtlı Bülten Aboneleri</h3>
                  <p className="mt-0.5 text-xs text-bodydark2">Abonelik durumlarını düzenleyin veya kayıtları silin</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={subFilter}
                    onChange={(e) => setSubFilter(e.target.value as 'all' | 'confirmed' | 'pending')}
                    className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
                  >
                    <option value="all">Tüm Aboneler</option>
                    <option value="confirmed">Sadece Onaylı</option>
                    <option value="pending">Sadece Onaysız</option>
                  </select>
                  <button
                    onClick={handleCsvDownload}
                    className="inline-flex items-center gap-1.5 rounded bg-meta-3 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-opacity-90"
                    disabled={filteredSubs.length === 0}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    CSV Excel
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stroke bg-gray-2 dark:border-strokedark dark:bg-meta-4">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-bodydark2 w-12">
                      #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-bodydark2">
                      E-posta
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-bodydark2">
                      Kayıt Tarihi
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-bodydark2 w-28">
                      Durum
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-bodydark2 w-32">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {filteredSubs.map((sub, i) => (
                    <tr
                      key={sub.id}
                      className="transition-colors hover:bg-gray-2 dark:hover:bg-meta-4/30"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs text-bodydark2">{i + 1}</td>
                      <td className="px-3 py-3.5 font-medium text-black dark:text-white">{sub.email}</td>
                      <td className="px-3 py-3.5 text-body">{new Date(sub.date).toLocaleDateString('tr-TR')}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span
                          onClick={() => handleToggleStatus(sub.id)}
                          title="Durumu değiştirmek için tıklayın"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition hover:opacity-85 ${
                            sub.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${sub.status === 'confirmed' ? 'bg-meta-3' : 'bg-warning'}`} />
                          {sub.status === 'confirmed' ? 'Onaylı' : 'Onaysız'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(sub.id)}
                          title={sub.status === 'confirmed' ? 'Onaysız Yap' : 'Onayla'}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-stroke hover:border-primary hover:text-primary dark:border-strokedark dark:hover:border-primary"
                        >
                          {sub.status === 'confirmed' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteSubscriber(sub.id)}
                          title="Sil"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-stroke text-danger hover:border-danger hover:bg-danger/5 dark:border-strokedark"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSubs.length === 0 && (
              <div className="py-12 text-center text-sm text-bodydark2">
                Bu filtreye uygun kayıtlı abone bulunamadı.
              </div>
            )}

            <div className="flex items-center justify-between border-t border-stroke px-5 py-3 dark:border-strokedark">
              <span className="text-xs text-bodydark2">Toplam: {filteredSubs.length} listeleniyor</span>
              <span className="text-xs text-bodydark2">
                {totalConfirmedSubs} aktif onaylı abone var
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
