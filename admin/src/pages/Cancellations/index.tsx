import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { BsChevronRight, BsCheckLg, BsXLg } from 'react-icons/bs';

interface Cancellation {
  id: string;
  orderId: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  reason: string;
  description?: string;
  refundAmount?: string;
  adminNotes?: string;
  couponOffered?: boolean;
  couponCode?: string;
  couponValue?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  refundedAt?: string;
  order: {
    id: string;
    total: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      profile?: { firstName?: string; lastName?: string };
    };
  };
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-green-100 text-green-800',
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Talep Alındı',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  REFUNDED: 'Tamamlandı',
};

const REASON_LABELS: Record<string, string> = {
  CHANGED_MIND: 'Siparişten Vazgeçtim',
  DELIVERY_TIME_LONG: 'Teslimat Süresi Çok Uzun',
  BETTER_PRICE_FOUND: 'Başka Platformda Daha Uygun Fiyat',
  PRODUCT_INFO_ERROR: 'Ürün Bilgilerinde Hata/Eksiklik',
  OTHER: 'Diğer',
};

function CancellationDetail({ cancellation, onClose, onSuccess }: { cancellation: Cancellation; onClose: () => void; onSuccess: () => void }) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalType, setApprovalType] = useState<'refund' | 'coupon'>('refund');
  const [couponCode, setCouponCode] = useState('');
  const [couponValue, setCouponValue] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const handleApprove = async () => {
    if (approvalType === 'coupon') {
      if (!couponCode.trim() || !couponValue.trim()) {
        alert('Kupon kodu ve değeri gereklidir');
        return;
      }
    }

    setApproving(true);
    try {
      await api.put(`/checkout/admin/cancellations/${cancellation.id}/approve`, {
        adminNotes: approvalNotes,
        couponOffered: approvalType === 'coupon',
        couponCode: approvalType === 'coupon' ? couponCode : undefined,
        couponValue: approvalType === 'coupon' ? parseFloat(couponValue) : undefined,
      });
      alert('İptal onaylandı');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.put(`/checkout/admin/cancellations/${cancellation.id}/reject`, { reason: rejectionReason });
      alert('İptal reddedildi');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setRejecting(false);
    }
  };

  const handleRefund = async () => {
    setRefunding(true);
    try {
      await api.post(`/checkout/admin/cancellations/${cancellation.id}/refund`, {});
      alert('İade işlemi tamamlandı');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setRefunding(false);
    }
  };

  const handleUnreject = async () => {
    if (!confirm('Reddi iptal etmek istediğinizden emin misiniz? Müşteri yeni talep gönderebilecek.')) return;
    setRejecting(true);
    try {
      await api.delete(`/checkout/admin/cancellations/${cancellation.id}/unreject`);
      alert('İptal reddi iptal edildi');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-white shadow-xl z-50 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex-1">
            <h2 className="text-lg font-bold">İptal Talebi: #{cancellation.orderId.slice(-8).toUpperCase()}</h2>
            <p className="text-sm text-gray-600 mt-1">{cancellation.order.user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <BsXLg className="h-5 w-5" />
          </button>
        </div>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white">
          <div>
            <h2 className="text-lg font-bold">İptal Talebi: #{cancellation.orderId.slice(-8).toUpperCase()}</h2>
            <p className="text-sm text-gray-600 mt-1">{cancellation.order.user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <BsXLg className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Durum</label>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[cancellation.status]}`}>
              {STATUS_LABELS[cancellation.status]}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">İptal Nedeni</label>
              <p className="text-sm text-gray-700">{REASON_LABELS[cancellation.reason] || cancellation.reason}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">İade Tutarı</label>
              <p className="text-sm font-mono text-gray-700">{cancellation.refundAmount} TRY</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Talep Tarihi</label>
              <p className="text-sm text-gray-700">{new Date(cancellation.requestedAt).toLocaleDateString('tr-TR')}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Sipariş Tarihi</label>
              <p className="text-sm text-gray-700">{new Date(cancellation.order.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {/* Description */}
          {cancellation.description && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Açıklama</label>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{cancellation.description}</p>
            </div>
          )}

          {/* Coupon Info (if offered) */}
          {cancellation.couponOffered && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Kupon Teklifi</label>
              <div className="bg-amber-50 p-3 rounded border border-amber-200 space-y-1 text-sm">
                <p><span className="text-gray-700">Kupon Kodu:</span> <span className="font-mono font-semibold text-amber-700">{cancellation.couponCode}</span></p>
                <p><span className="text-gray-700">Kupon Değeri:</span> <span className="font-semibold text-amber-700">{cancellation.couponValue} TRY</span></p>
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {cancellation.adminNotes && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Yönetici Notları</label>
              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">{cancellation.adminNotes}</p>
            </div>
          )}

          {/* Actions */}
          {cancellation.status === 'REQUESTED' && (
            <div className="border-t pt-6 space-y-4">
              {/* Approval Type Selection */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">Onay Şekli</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="refund"
                      checked={approvalType === 'refund'}
                      onChange={(e) => setApprovalType(e.target.value as 'refund' | 'coupon')}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">İade Yap ({cancellation.refundAmount} TRY)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="coupon"
                      checked={approvalType === 'coupon'}
                      onChange={(e) => setApprovalType(e.target.value as 'refund' | 'coupon')}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Kupon Teklifi (Satış Tutma)</span>
                  </label>
                </div>
              </div>

              {/* Coupon Fields (visible when coupon is selected) */}
              {approvalType === 'coupon' && (
                <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Kupon Kodu</label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Örn: RETURN2024"
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Kupon Değeri (TRY)</label>
                    <input
                      type="number"
                      value={couponValue}
                      onChange={(e) => setCouponValue(e.target.value)}
                      placeholder={String(cancellation.refundAmount)}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Notlar (İsteğe Bağlı)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Onay işlemi hakkında notlar..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary"
                  rows={2}
                />
              </div>

              {/* Approve Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <BsCheckLg className="h-4 w-4" />
                  {approving ? 'İşleniyor...' : 'Onayla'}
                </button>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Reddetme Sebebi (İsteğe Bağlı)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Neden reddettiğinizi açıklayın..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary"
                  rows={3}
                />
              </div>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <BsXLg className="h-4 w-4" />
                {rejecting ? 'İşleniyor...' : 'Reddet'}
              </button>
            </div>
          )}

          {cancellation.status === 'APPROVED' && (
            <div className="border-t pt-6">
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {refunding ? 'İşleniyor...' : 'İadeyi Gönder'}
              </button>
            </div>
          )}

          {cancellation.status === 'REJECTED' && (
            <div className="border-t pt-6">
              <button
                onClick={handleUnreject}
                disabled={rejecting}
                className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {rejecting ? 'İşleniyor...' : 'Reddi İptal Et'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function Cancellations() {
  const [filter, setFilter] = useState<'all' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED'>('all');
  const [selectedCancellation, setSelectedCancellation] = useState<Cancellation | null>(null);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCancellations = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/checkout/admin/cancellations${filter !== 'all' ? `?status=${filter}` : ''}`
      );
      console.log('Full response:', res);
      console.log('res.data:', res.data);
      const responseData = res.data as any;
      const cancellationList = responseData.data || responseData || [];
      console.log('Setting cancellations to:', cancellationList, 'Length:', Array.isArray(cancellationList) ? cancellationList.length : 'NOT ARRAY');
      setCancellations(Array.isArray(cancellationList) ? cancellationList : []);
    } catch (err: any) {
      console.error('Error fetching cancellations:', err);
      alert('İptal talepleri yüklenemedi: ' + (err.message || err));
      setCancellations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, [filter]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">İptal & İade Yönetimi</h1>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'REQUESTED', 'APPROVED', 'REJECTED', 'REFUNDED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Tümü' : STATUS_LABELS[status]}
              {status !== 'all' && cancellations.filter((c) => c.status === status).length > 0 && (
                <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                  {cancellations.filter((c) => c.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      ) : cancellations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">İptal talebi bulunamadı</div>
      ) : (
        <div className="border rounded-lg divide-y">
          {cancellations.map((cancellation) => (
            <div
              key={cancellation.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedCancellation(cancellation)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium">#{cancellation.orderId.slice(-8).toUpperCase()}</span>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[cancellation.status]}`}>
                    {STATUS_LABELS[cancellation.status]}
                  </div>
                  {cancellation.couponCode && (
                    <div className="inline-block px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      🎟️ {cancellation.couponCode}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {cancellation.order.user.profile?.firstName} {cancellation.order.user.profile?.lastName || cancellation.order.user.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">{REASON_LABELS[cancellation.reason]}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-semibold">{cancellation.refundAmount} TRY</p>
                <p className="text-xs text-gray-500">{new Date(cancellation.requestedAt).toLocaleDateString('tr-TR')}</p>
              </div>
              <BsChevronRight className="h-5 w-5 text-gray-400 ml-4" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedCancellation && (
        <CancellationDetail
          cancellation={selectedCancellation}
          onClose={() => setSelectedCancellation(null)}
          onSuccess={() => fetchCancellations()}
        />
      )}
    </div>
  );
}
