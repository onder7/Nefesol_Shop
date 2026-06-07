import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapPin, Trash2, Edit2, Plus, ArrowLeft } from 'lucide-react';

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district?: string;
  address: string;
  postalCode: string;
  type: 'SHIPPING' | 'BILLING';
}

export function Addresses() {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    district: string;
    address: string;
    postalCode: string;
    type: 'SHIPPING' | 'BILLING';
  }>({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    district: '',
    address: '',
    postalCode: '',
    type: 'SHIPPING',
  });

  const { data: addresses = [], isLoading, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await fetch('/api/addresses', { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });

  async function handleSaveAddress() {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Adres kaydedilemedi');

      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        city: '',
        district: '',
        address: '',
        postalCode: '',
        type: 'SHIPPING',
      });
      setIsAdding(false);
      setEditingId(null);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!window.confirm('Bu adresi silmek istediğinize emin misiniz?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Adres silinemedi');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/hesabim')}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Adreslerim
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gönderim ve fatura adreslerinizi yönetin
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({
                firstName: '',
                lastName: '',
                phone: '',
                city: '',
                district: '',
                address: '',
                postalCode: '',
                type: 'SHIPPING',
              });
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white font-medium hover:bg-opacity-90 transition-all"
          >
            <Plus size={20} />
            Yeni Adres
          </button>
        </div>

        {/* Addresses List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : addresses.length === 0 && !isAdding ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 p-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Henüz kayıtlı adres bulunmamaktadır
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-block text-primary hover:underline font-medium"
            >
              İlk adresini ekle →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mb-8">
            {addresses.map((addr: Address) => (
              <div
                key={addr.id}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {addr.firstName} {addr.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {addr.type === 'SHIPPING' ? '📦 Gönderim Adresi' : '💳 Fatura Adresi'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(addr.id);
                        setIsAdding(true);
                        setFormData({
                          firstName: addr.firstName,
                          lastName: addr.lastName,
                          phone: addr.phone,
                          city: addr.city,
                          district: addr.district || '',
                          address: addr.address,
                          postalCode: addr.postalCode,
                          type: addr.type,
                        });
                      }}
                      className="text-gray-500 hover:text-primary transition-colors p-2"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      disabled={deleting === addr.id}
                      className="text-gray-500 hover:text-red-500 transition-colors p-2 disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">{addr.address}</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {addr.postalCode} {addr.city}
                    {addr.district && ` / ${addr.district}`}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">📱 {addr.phone}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form */}
        {isAdding && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingId ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
            </h2>

            <div className="space-y-4">
              {/* Ad Soyadı */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Soyadı
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  placeholder="+90 5XX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Adres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adres
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Şehir, İlçe, Posta Kodu */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şehir
                  </label>
                  <input
                    type="text"
                    placeholder="Istanbul"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    İlçe
                  </label>
                  <input
                    type="text"
                    placeholder="Beyoğlu"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Posta Kodu
                  </label>
                  <input
                    type="text"
                    placeholder="34200"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Adres Türü */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adres Türü
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="SHIPPING"
                      checked={formData.type === 'SHIPPING'}
                      onChange={() =>
                        setFormData({ ...formData, type: 'SHIPPING' })
                      }
                    />
                    <span className="text-gray-700 dark:text-gray-300">📦 Gönderim Adresi</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="BILLING"
                      checked={formData.type === 'BILLING'}
                      onChange={() =>
                        setFormData({ ...formData, type: 'BILLING' })
                      }
                    />
                    <span className="text-gray-700 dark:text-gray-300">💳 Fatura Adresi</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveAddress}
                  className="flex-1 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all"
                >
                  {editingId ? 'Güncelle' : 'Ekle'}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setFormData({
                      firstName: '',
                      lastName: '',
                      phone: '',
                      city: '',
                      district: '',
                      address: '',
                      postalCode: '',
                      type: 'SHIPPING',
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
