import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';

interface Customer {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  totalSpent: number;
  profile?: { firstName?: string; lastName?: string; phone?: string };
  _count: { orders: number };
}

interface CustomersData {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
}

interface CustomerDetail {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    isActive: boolean;
    createdAt: string;
    marketingConsent: boolean;
  };
  summary: {
    orderCount: number;
    paidOrderCount: number;
    totalSpent: number;
  };
  orders: {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    paymentMethod: string | null;
    paymentStatus: string | null;
    items: {
      name: string;
      quantity: number;
      unitPrice: number;
    }[];
  }[];
}

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export default function Customers() {
  const [data, setData] = useState<CustomersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    api.get<{ success: boolean; data: CustomersData }>(`/admin/customers?${params}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(userId: string) {
    setToggling(userId);
    try {
      await api.put(`/admin/customers/${userId}/toggle-status`, {});
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hata');
    } finally {
      setToggling(null);
    }
  }

  async function viewCustomer(userId: string) {
    setSelectedCustomerId(userId);
    setDetailLoading(true);
    setCustomerDetail(null);
    try {
      const res = await api.get<{ success: boolean; data: CustomerDetail }>(`/admin/customers/${userId}`);
      if (res.success) {
        setCustomerDetail(res.data);
      }
    } catch (err) {
      console.error(err);
      alert('Müşteri detayları alınamadı');
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">Müşteri Yönetimi</h2>
        <span className="text-sm text-gray-500">{data?.total ?? 0} müşteri</span>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
          placeholder="Ad, soyad veya email..."
          className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white w-64"
        />
        <button
          onClick={() => { setSearch(searchInput); setPage(1); }}
          className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-opacity-90"
        >
          Ara
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Müşteri</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Telefon</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Sipariş</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Toplam Harcama</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Kayıt Tarihi</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Durum</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data?.customers.map((c) => {
                  const name = c.profile?.firstName
                    ? `${c.profile.firstName} ${c.profile.lastName ?? ''}`.trim()
                    : '—';
                  return (
                    <tr key={c.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {(c.profile?.firstName ?? c.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-black dark:text-white">{name}</div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{c.profile?.phone ?? '—'}</td>
                      <td className="px-5 py-4 text-center font-medium">{c._count.orders}</td>
                      <td className="px-5 py-4 font-medium">{fmt(c.totalSpent)}</td>
                      <td className="px-5 py-4 text-gray-500">{new Date(c.createdAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {c.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewCustomer(c.id)}
                            className="px-3 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          >
                            İncele
                          </button>
                          <button
                            onClick={() => toggleStatus(c.id)}
                            disabled={toggling === c.id}
                            className={`px-3 py-1 rounded text-xs font-medium transition disabled:opacity-50 ${
                              c.isActive
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {c.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data?.customers.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">Müşteri bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-stroke dark:border-strokedark">
            <span className="text-sm text-gray-500">{data.total} müşteri</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded border border-stroke text-sm disabled:opacity-40 hover:bg-gray-50">
                Önceki
              </button>
              <span className="px-3 py-1 text-sm">{page} / {data.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                className="px-3 py-1 rounded border border-stroke text-sm disabled:opacity-40 hover:bg-gray-50">
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white dark:bg-boxdark p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black dark:text-white">Müşteri Detayı</h3>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="text-gray-500 hover:text-black dark:hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2">
              {detailLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : customerDetail ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded border border-stroke p-4 dark:border-strokedark">
                      <p className="text-sm text-gray-500 mb-1">Müşteri Bilgileri</p>
                      <p className="font-semibold text-black dark:text-white">{customerDetail.user.firstName} {customerDetail.user.lastName}</p>
                      <p className="text-sm">{customerDetail.user.email}</p>
                      <p className="text-sm">{customerDetail.user.phone || 'Telefon yok'}</p>
                      <p className="text-sm text-gray-500 mt-2">Kayıt: {new Date(customerDetail.user.createdAt).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div className="rounded border border-stroke p-4 dark:border-strokedark">
                      <p className="text-sm text-gray-500 mb-1">Alışveriş Özeti</p>
                      <p className="text-sm">Toplam Sipariş: <span className="font-semibold text-black dark:text-white">{customerDetail.summary.orderCount}</span></p>
                      <p className="text-sm">Başarılı Sipariş: <span className="font-semibold text-black dark:text-white">{customerDetail.summary.paidOrderCount}</span></p>
                      <p className="text-sm mt-2">Toplam Harcama:</p>
                      <p className="text-xl font-bold text-primary">{fmt(customerDetail.summary.totalSpent)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-black dark:text-white mb-3">Sipariş Geçmişi</h4>
                    {customerDetail.orders.length > 0 ? (
                      <div className="space-y-3">
                        {customerDetail.orders.map(order => (
                          <div key={order.id} className="rounded border border-stroke p-4 dark:border-strokedark">
                            <div className="flex justify-between items-center mb-2 border-b border-stroke pb-2 dark:border-strokedark">
                              <div>
                                <span className="font-mono text-sm font-semibold">#{order.id.slice(-8).toUpperCase()}</span>
                                <span className="ml-3 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                  order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {order.status}
                                </span>
                                <span className="font-bold">{fmt(order.total)}</span>
                              </div>
                            </div>
                            <ul className="text-sm space-y-1 mt-2">
                              {order.items.map((item, idx) => (
                                <li key={idx} className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-300">{item.quantity}x {item.name}</span>
                                  <span>{fmt(item.unitPrice)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Müşterinin henüz siparişi yok.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center py-10 text-red-500">Müşteri detayları yüklenemedi.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
