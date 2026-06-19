import { useEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import ReactApexChart from '../../lib/react-apexcharts';
import { api } from '../../lib/api';

interface Row {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  avgSellingPrice: number;
  cogs: number | null;
  profit: number | null;
  marginPct: number | null;
  costKnown: boolean;
  firstSalePrice: number | null;
  lastSalePrice: number | null;
  minSalePrice: number | null;
  maxSalePrice: number | null;
  currentMinPrice: number | null;
  currentMaxPrice: number | null;
  priceChangeCount: number;
  lastPriceChange: string | null;
}

interface PriceChange {
  id: string;
  sku: string;
  oldPrice: number;
  newPrice: number;
  createdAt: string;
}

const fmt = (n: number) =>
  n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('tr-TR') : '—');

function priceRange(r: Row) {
  if (r.currentMinPrice == null) return '—';
  if (r.currentMaxPrice != null && r.currentMaxPrice !== r.currentMinPrice) {
    return `${fmt(r.currentMinPrice)} – ${fmt(r.currentMaxPrice)}`;
  }
  return fmt(r.currentMinPrice);
}

function saleRange(r: Row) {
  if (r.minSalePrice == null) return '—';
  if (r.maxSalePrice != null && r.maxSalePrice !== r.minSalePrice) {
    return `${fmt(r.minSalePrice)} – ${fmt(r.maxSalePrice)}`;
  }
  return fmt(r.minSalePrice);
}

// İlk → son satış fiyatı yönü
function trend(r: Row) {
  if (r.firstSalePrice == null || r.lastSalePrice == null) return null;
  if (r.lastSalePrice > r.firstSalePrice) return { sym: '▲', cls: 'text-green-600' };
  if (r.lastSalePrice < r.firstSalePrice) return { sym: '▼', cls: 'text-red-600' };
  return { sym: '＝', cls: 'text-gray-400' };
}

export default function PricingReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, PriceChange[]>>({});

  useEffect(() => {
    api
      .get<{ success: boolean; data: Row[] }>('/admin/reports/product-pricing')
      .then((r) => setRows(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function toggle(productId: string) {
    if (expanded === productId) {
      setExpanded(null);
      return;
    }
    setExpanded(productId);
    if (!history[productId]) {
      try {
        const r = await api.get<{ success: boolean; data: PriceChange[] }>(
          `/admin/reports/product-pricing/${productId}`,
        );
        setHistory((h) => ({ ...h, [productId]: r.data ?? [] }));
      } catch {
        setHistory((h) => ({ ...h, [productId]: [] }));
      }
    }
  }

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalUnits = rows.reduce((s, r) => s + r.unitsSold, 0);

  // En çok ciro yapan ilk 10 ürün (rows zaten ciroya göre azalan sıralı)
  const TOP_N = 10;
  const topProducts = rows.filter((r) => r.revenue > 0).slice(0, TOP_N);
  const chartOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
    colors: ['#3C50E0'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: topProducts.map((r) => (r.name.length > 28 ? r.name.slice(0, 27) + '…' : r.name)),
      labels: { formatter: (v) => fmt(Number(v)) },
    },
    tooltip: { y: { formatter: (v) => fmt(Number(v)) } },
    grid: { strokeDashArray: 4 },
  };
  const chartSeries = [{ name: 'Ciro', data: topProducts.map((r) => Math.round(r.revenue)) }];

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="text-title-md2 font-bold text-black dark:text-white mb-1">Fiyat & Ciro Raporu</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Ürün bazında satılan adet, ciro ve ortalama satış fiyatı. Ciro, her siparişin o anki gerçek
        satış fiyatından hesaplanır (fiyat değişse bile doğrudur). Bir ürünün fiyat değişim geçmişini
        görmek için satıra tıklayın.
      </p>

      {/* Özet kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-sm border border-stroke bg-white px-5 py-4 dark:border-strokedark dark:bg-boxdark">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Toplam Ciro</p>
          <p className="text-2xl font-bold text-black dark:text-white">{fmt(totalRevenue)}</p>
        </div>
        <div className="rounded-sm border border-stroke bg-white px-5 py-4 dark:border-strokedark dark:bg-boxdark">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Satılan Adet</p>
          <p className="text-2xl font-bold text-black dark:text-white">{totalUnits.toLocaleString('tr-TR')}</p>
        </div>
        <div className="rounded-sm border border-stroke bg-white px-5 py-4 dark:border-strokedark dark:bg-boxdark">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Genel Ort. Satış Fiyatı</p>
          <p className="text-2xl font-bold text-black dark:text-white">
            {totalUnits > 0 ? fmt(totalRevenue / totalUnits) : '—'}
          </p>
        </div>
      </div>

      {/* En çok ciro yapan ilk 10 ürün */}
      {topProducts.length > 0 && (
        <div className="rounded-sm border border-stroke bg-white px-5 py-4 dark:border-strokedark dark:bg-boxdark mb-6">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-2">
            En Çok Ciro Yapan İlk {topProducts.length} Ürün
          </h2>
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="bar"
            height={Math.max(220, topProducts.length * 38)}
          />
        </div>
      )}

      <div className="rounded-sm border border-stroke bg-white dark:border-strokedark dark:bg-boxdark overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Yükleniyor…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Henüz satış veya fiyat değişimi olan ürün yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-strokedark text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3 text-right">Satılan</th>
                <th className="px-4 py-3 text-right">Ciro</th>
                <th className="px-4 py-3 text-right">Kâr Marjı</th>
                <th className="px-4 py-3 text-right">Ort. Satış</th>
                <th className="px-4 py-3 text-right">İlk Satış</th>
                <th className="px-4 py-3 text-right">Son Satış</th>
                <th className="px-4 py-3 text-right">Satış Aralığı</th>
                <th className="px-4 py-3 text-right">Güncel</th>
                <th className="px-4 py-3 text-center">Değişim</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <>
                  <tr
                    key={r.productId}
                    onClick={() => toggle(r.productId)}
                    className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-black dark:text-white">{r.name}</td>
                    <td className="px-4 py-3 text-right">{r.unitsSold.toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-black dark:text-white">{fmt(r.revenue)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.marginPct != null ? (
                        <span
                          className={r.marginPct >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}
                          title={r.profit != null ? `Kâr: ${fmt(r.profit)}` : ''}
                        >
                          %{r.marginPct.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600" title="Bu ürüne maliyet (alış fiyatı) girilmemiş">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{r.unitsSold > 0 ? fmt(r.avgSellingPrice) : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {r.firstSalePrice != null ? fmt(r.firstSalePrice) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {r.lastSalePrice != null ? (
                        <>
                          {fmt(r.lastSalePrice)}
                          {trend(r) && <span className={`ml-1 ${trend(r)!.cls}`}>{trend(r)!.sym}</span>}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{saleRange(r)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{priceRange(r)}</td>
                    <td className="px-4 py-3 text-center">
                      {r.priceChangeCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {r.priceChangeCount}× · {fmtDate(r.lastPriceChange)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                  {expanded === r.productId && (
                    <tr className="bg-gray-50 dark:bg-meta-4">
                      <td colSpan={10} className="px-6 py-4">
                        {r.costKnown && (
                          <div className="mb-3 text-sm">
                            <span className="rounded bg-white dark:bg-boxdark px-2 py-1 border border-stroke dark:border-strokedark text-gray-500">
                              Maliyet (COGS): <strong>{r.cogs != null ? fmt(r.cogs) : '—'}</strong> ·
                              Kâr: <strong className={r.profit != null && r.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {r.profit != null ? fmt(r.profit) : '—'}
                              </strong> ·
                              Marj: <strong>{r.marginPct != null ? `%${r.marginPct.toFixed(1)}` : '—'}</strong>
                            </span>
                          </div>
                        )}
                        {/* Fiyat yolculuğu özeti */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Fiyat Yolculuğu:</span>
                          <span className="rounded bg-white dark:bg-boxdark px-2 py-1 border border-stroke dark:border-strokedark">
                            İlk satış <strong>{r.firstSalePrice != null ? fmt(r.firstSalePrice) : '—'}</strong>
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="rounded bg-white dark:bg-boxdark px-2 py-1 border border-stroke dark:border-strokedark">
                            Son satış <strong>{r.lastSalePrice != null ? fmt(r.lastSalePrice) : '—'}</strong>
                            {trend(r) && <span className={`ml-1 ${trend(r)!.cls}`}>{trend(r)!.sym}</span>}
                          </span>
                          <span className="rounded bg-white dark:bg-boxdark px-2 py-1 border border-stroke dark:border-strokedark text-gray-500">
                            En düşük–yüksek satış: <strong>{saleRange(r)}</strong>
                          </span>
                          <span className="rounded bg-white dark:bg-boxdark px-2 py-1 border border-stroke dark:border-strokedark text-gray-500">
                            Güncel fiyat: <strong>{priceRange(r)}</strong>
                          </span>
                          <span className="rounded bg-white dark:bg-boxdark px-2 py-1 border border-stroke dark:border-strokedark text-gray-500">
                            Ort. satış: <strong>{r.unitsSold > 0 ? fmt(r.avgSellingPrice) : '—'}</strong>
                          </span>
                        </div>

                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                          Fiyat Değişim Geçmişi
                        </p>
                        {!history[r.productId] ? (
                          <p className="text-sm text-gray-400">Yükleniyor…</p>
                        ) : history[r.productId].length === 0 ? (
                          <p className="text-sm text-gray-400">Bu ürün için kayıtlı fiyat değişimi yok.</p>
                        ) : (
                          <ul className="space-y-1">
                            {history[r.productId].map((h) => (
                              <li key={h.id} className="flex items-center gap-3 text-sm">
                                <span className="text-gray-400 w-24">{fmtDate(h.createdAt)}</span>
                                <span className="font-mono text-xs text-gray-400">{h.sku}</span>
                                <span className="text-gray-500 line-through">{fmt(h.oldPrice)}</span>
                                <span className="text-gray-400">→</span>
                                <span
                                  className={`font-semibold ${h.newPrice >= h.oldPrice ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {fmt(h.newPrice)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
