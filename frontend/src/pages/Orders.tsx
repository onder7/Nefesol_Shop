import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, ChevronRight, Clock, Truck, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { checkoutApi } from '@/services/checkoutApi';
import { CancellationModal } from '@/components/order/CancellationModal';
import { CancellationStatus } from '@/components/order/CancellationStatus';
import type { Order } from '@/types';

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  PENDING:    { label: 'Beklemede',  variant: 'secondary',    icon: <Clock className="h-3 w-3" /> },
  PROCESSING: { label: 'Hazırlanıyor', variant: 'default',   icon: <RefreshCw className="h-3 w-3" /> },
  SHIPPED:    { label: 'Kargoda',    variant: 'outline',      icon: <Truck className="h-3 w-3" /> },
  DELIVERED:  { label: 'Teslim Edildi', variant: 'default',  icon: <CheckCircle className="h-3 w-3" /> },
  CANCELLED:  { label: 'İptal Edildi', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  REFUNDED:   { label: 'İade Edildi', variant: 'outline',    icon: <RefreshCw className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, variant: 'outline' as const, icon: null };
  return (
    <Badge variant={meta.variant} className="flex items-center gap-1 w-fit">
      {meta.icon}
      {meta.label}
    </Badge>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const firstItem = order.items[0];
  const productName = (firstItem?.variant as { product?: { name: string } } | undefined)?.product?.name ?? '—';
  const extraCount = order.items.length - 1;

  return (
    <Link
      to={`/hesabim/siparisler/${order.id}`}
      className="block border rounded-lg p-4 hover:border-primary transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-mono">
              #{order.id.slice(-8).toUpperCase()}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <p className="font-medium truncate">
            {productName}
            {extraCount > 0 && (
              <span className="text-muted-foreground text-sm"> +{extraCount} ürün</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>

          {/* Shipping Info */}
          {order.shipping && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
              {order.shipping.carrier && (
                <p>🚚 <span className="font-medium">{order.shipping.carrier}</span></p>
              )}
              {order.shipping.trackingNumber && (
                <p>Takip: <span className="font-mono">{order.shipping.trackingNumber}</span></p>
              )}
              {order.shipping.estimatedAt && (
                <p>Tahmini: {formatDate(order.shipping.estimatedAt)}</p>
              )}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-semibold">{formatPrice(order.total)}</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 ml-auto group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ─── Orders List ──────────────────────────────────────────────────────────────

export function Orders() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => (await checkoutApi.listOrders()).data.data,
  });

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="h-6 w-6" />
        Siparişlerim
      </h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : !orders?.length ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Henüz siparişiniz yok</h2>
          <p className="text-muted-foreground mb-6">İlk siparişinizi vermek için alışverişe başlayın.</p>
          <Button render={<Link to="/ara" />}>Alışverişe Başla</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </main>
  );
}

// ─── Order Detail ─────────────────────────────────────────────────────────────

export function OrderDetail() {
  const { id: orderId = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => (await checkoutApi.getOrder(orderId)).data.data,
    enabled: !!orderId,
  });
  const { data: cancellation } = useQuery({
    queryKey: ['order-cancellation', orderId],
    queryFn: async () => {
      try {
        const res = await (await import('@/services/api')).api.get<{ success: boolean; data: any }>(
          `/checkout/orders/${orderId}/cancellation`
        );
        return res.data.success ? res.data.data : null;
      } catch {
        return null;
      }
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Sipariş bulunamadı.</p>
        <Button render={<Link to="/hesabim/siparisler" />} variant="outline">Geri Dön</Button>
      </main>
    );
  }

  const addr = order.address as { firstName: string; lastName: string; address: string; district: string; city: string } | undefined;

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link to="/hesabim/siparisler" className="hover:text-foreground">Siparişlerim</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">#{order.id.slice(-8).toUpperCase()}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sipariş Detayı</h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Order Information */}
      <div className="border rounded-lg p-4 bg-gray-50 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Sipariş No</p>
            <p className="font-mono font-semibold">#TR-{order.id.slice(-8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Sipariş Tarihi</p>
            <p className="text-sm">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Toplam Tutar</p>
            <p className="text-sm font-semibold">{formatPrice(Number(order.total))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Ödeme Yöntemi</p>
            <p className="text-sm font-mono">{order.paymentMethod || '—'}</p>
          </div>
          {order.paymentId && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Ödendi</p>
              <p className="text-sm font-mono">{order.paymentId}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Sipariş Durumu</p>
            <p className="text-sm"><StatusBadge status={order.status} /></p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="border rounded-lg divide-y mb-4">
        {order.items.map((item) => {
          const product = (item.variant as { product: { name: string; slug: string; images?: { url: string }[] } }).product;
          const img = product.images?.[0];
          return (
            <div key={item.id} className="flex items-center gap-3 p-4">
              <div className="w-16 h-16 rounded bg-gray-50 flex-shrink-0 overflow-hidden">
                {img ? (
                  <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full bg-gray-100" />}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/urun/${product.slug}`} className="font-medium hover:text-primary line-clamp-1">
                  {product.name}
                </Link>
                <p className="text-sm text-muted-foreground">Adet: {item.quantity}</p>
              </div>
              <p className="font-medium">{formatPrice(Number(item.unitPrice) * item.quantity)}</p>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="border rounded-lg p-4 space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span>Ara Toplam</span>
          <span>{formatPrice(Number(order.subtotal))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Kargo</span>
          <span>{Number(order.shippingFee) === 0 ? 'Ücretsiz' : formatPrice(Number(order.shippingFee))}</span>
        </div>
        {Number(order.discount) > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>İndirim</span>
            <span>−{formatPrice(Number(order.discount))}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold border-t pt-2">
          <span>Toplam</span>
          <span>{formatPrice(Number(order.total))}</span>
        </div>
      </div>

      {/* Address */}
      {addr && (
        <div className="border rounded-lg p-4 mb-4">
          <p className="text-sm font-medium mb-1">Teslimat Adresi</p>
          <p className="text-sm text-muted-foreground">
            {addr.firstName} {addr.lastName}<br />
            {addr.address}, {addr.district} / {addr.city}
          </p>
        </div>
      )}

      {/* Shipping info */}
      {order.shipping && (
        <div className="border rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Kargo Bilgisi</p>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            {order.shipping.carrier && (
              <p>Kargo Firması: <span className="text-foreground font-medium">{order.shipping.carrier}</span></p>
            )}
            {order.shipping.trackingNumber ? (
              <p>
                Takip No:{' '}
                <span className="text-foreground font-mono font-medium">{order.shipping.trackingNumber}</span>
              </p>
            ) : (
              <p className="text-muted-foreground italic">Takip numarası henüz girilmedi.</p>
            )}
            {order.shipping.estimatedAt && (
              <p>Tahmini Teslimat: <span className="text-foreground">{formatDate(order.shipping.estimatedAt)}</span></p>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Status */}
      {cancellation && (
        <CancellationStatus status={cancellation.status} reason={cancellation.reason} />
      )}

      {/* Cancel Request Button */}
      {!cancellation && ['PENDING', 'PROCESSING'].includes(order.status) && (
        <div className="border rounded-lg p-4 mb-4 bg-blue-50 border-blue-200 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Siparişi İptal Edebilirsiniz</p>
              <p className="text-sm text-blue-800 mt-1">Kargo gitmeden önce siparişinizi iptal edebilirsiniz. Ödemeniz 1-7 iş günü içinde iade edilecektir.</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsCancellationModalOpen(true)}
            className="ml-4 flex-shrink-0"
          >
            İptal Et
          </Button>
        </div>
      )}

      {/* Status history */}
      {(order as unknown as { statusHistory?: Array<{ id: string; status: string; note?: string; createdAt: string }> }).statusHistory && (
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-3">Sipariş Geçmişi</p>
          <ol className="relative border-l border-muted ml-2 space-y-4">
            {((order as unknown as { statusHistory: Array<{ id: string; status: string; note?: string; createdAt: string }> }).statusHistory).map((log) => (
              <li key={log.id} className="ml-4">
                <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary" />
                <div className="flex items-center gap-2">
                  <StatusBadge status={log.status} />
                  <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                </div>
                {log.note && <p className="text-xs text-muted-foreground mt-1">{log.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button variant="outline" render={<Link to="/hesabim/siparisler" />}>← Siparişlerim</Button>
        <Button render={<Link to="/ara" />}>Alışverişe Devam</Button>
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        orderId={orderId}
        isOpen={isCancellationModalOpen}
        onClose={() => setIsCancellationModalOpen(false)}
        onSuccess={() => {
          refetch();
          qc.invalidateQueries({ queryKey: ['order-cancellation', orderId] });
        }}
      />
    </main>
  );
}
