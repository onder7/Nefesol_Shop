import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CancellationStatusProps {
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  reason?: string;
  orderId?: string;
  couponOffered?: boolean;
  couponCode?: string;
  couponValue?: number;
  adminNotes?: string;
  onRetract?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  REQUESTED: {
    label: 'İptal Talep Edildi',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
  },
  APPROVED: {
    label: 'İptal Onaylandı',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  REJECTED: {
    label: 'İptal Reddedildi',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
  REFUNDED: {
    label: 'İade Tamamlandı',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
};

const REASON_CONFIG: Record<string, string> = {
  CHANGED_MIND: 'Siparişten Vazgeçtim',
  DELIVERY_TIME_LONG: 'Teslimat Süresi Çok Uzun',
  BETTER_PRICE_FOUND: 'Başka Platformda Daha Uygun Fiyat',
  PRODUCT_INFO_ERROR: 'Ürün Bilgilerinde Hata/Eksiklik',
  OTHER: 'Diğer',
};

export function CancellationStatus({
  status,
  reason,
  orderId,
  couponOffered,
  couponCode,
  couponValue,
  adminNotes,
  onRetract
}: CancellationStatusProps) {
  const config = STATUS_CONFIG[status];
  const reasonLabel = reason ? REASON_CONFIG[reason] : null;
  const [retracting, setRetracting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRetractCancellation = async () => {
    if (!orderId) return;
    if (!confirm('İptal talebinizi geri almak istediğinizden emin misiniz?')) return;

    setRetracting(true);
    try {
      await api.delete(`/checkout/orders/${orderId}/cancel-request`);
      toast.success('Kupon başarıyla size teklif edildi!');
      onRetract?.();
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız oldu');
    } finally {
      setRetracting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(couponCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Kupon kabul edilmiş durumu (REFUNDED + couponCode)
  const isCouponAccepted = status === 'REFUNDED' && couponCode;

  if (isCouponAccepted) {
    return (
      <div className="border-2 border-green-300 rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50 space-y-4">
        {/* Başarı Mesajı */}
        <div className="space-y-2">
          <p className="text-xl font-bold text-green-800 flex items-center gap-2">
            <span className="text-3xl">✅</span> Kupon Başarıyla Uygulandı!
          </p>
          <p className="text-sm text-green-700 leading-relaxed">
            Tebrikler! İptal talebinizi geri aldınız ve
            <span className="font-bold"> {couponValue} TRY değerinde kupon</span>
            başarıyla sisteme eklendi. Bundan sonraki alışverişinizde kullanabilirsiniz.
          </p>
        </div>

        {/* Kupon Bilgisi */}
        <div className="bg-white rounded-lg border-2 border-green-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Kupon Kodunuz</p>
              <p className="font-mono font-bold text-2xl text-green-700">{couponCode}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tasarruf Miktarı</p>
              <p className="font-bold text-2xl text-green-600">{couponValue} TRY</p>
            </div>
          </div>
        </div>

        {/* Avantajlar */}
        <div className="bg-green-100 rounded-lg p-4 space-y-2 border border-green-200">
          <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
            <span>🎁</span> Bundan Sonra Ne Yapabilirsiniz?
          </p>
          <ul className="text-sm text-green-800 space-y-1 ml-6">
            <li>• Herhangi bir ürüne {couponValue} TRY indirim uygulayın</li>
            <li>• Kupon kodunu kopyalayıp alışverişe başlayın</li>
            <li>• 30 gün içinde kullanabilirsiniz</li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleCopyCode}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
          >
            {copied ? '✓ Kopyalandı!' : '📋 Kupon Kodunu Kopyala'}
          </Button>
          <Button
            render={<Link to="/ara" />}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
          >
            🛍️ Alışverişe Başla
          </Button>
        </div>
      </div>
    );
  }

  // Diğer durumlar
  return (
    <div className={`border rounded-lg p-4 ${config.bgColor} space-y-3`}>
      <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
      {reasonLabel && <p className="text-xs text-gray-600">{reasonLabel}</p>}
      {adminNotes && <p className="text-xs text-gray-700 bg-white/50 p-2 rounded">{adminNotes}</p>}

      {/* Kupon Teklifi (APPROVED durumunda) */}
      {status === 'APPROVED' && couponOffered && couponCode && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-4 mt-4">
          {/* Header */}
          <div className="space-y-2">
            <p className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <span className="text-2xl">✨</span> Sizin İçin Özel Bir Teklif
            </p>
            <p className="text-sm text-amber-800 leading-relaxed">
              Siparişinizi iptal etmek istemediğinizi anladık. Size aynı miktarda alışveriş yapabileceğiniz
              <span className="font-bold text-amber-900"> {couponValue} TRY değerinde bir kupon</span>
              hazırladık — tamamen sizin için!
            </p>
          </div>

          {/* Kupon Card */}
          <div className="bg-white rounded-lg border-2 border-amber-200 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Kupon Kodunuz</p>
                <p className="font-mono font-bold text-2xl text-amber-700">{couponCode}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Kullanabileceğiniz Tutar</p>
                <p className="font-bold text-2xl text-amber-600">{couponValue} TRY</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 border-t border-amber-100 pt-3">
              💡 <span className="font-medium">Avantaj:</span> Bu kupon ile istediğiniz herhangi bir üründe alışveriş yapabilir ve
              <span className="font-bold"> {couponValue} TRY indirim</span> alabilirsiniz!
            </p>
          </div>

          {/* CTA */}
          {orderId && (
            <Button
              size="sm"
              onClick={handleRetractCancellation}
              disabled={retracting}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 text-base"
            >
              {retracting ? '⏳ İşleniyor...' : '🎉 Kuponu Hemen Kabul Et'}
            </Button>
          )}

          <p className="text-xs text-amber-700 text-center bg-amber-100 rounded px-3 py-2">
            Kuponu kabul ederseniz, bu siparişi iptal etmek yerine kupona sahip olacaksınız.
          </p>
        </div>
      )}
    </div>
  );
}
