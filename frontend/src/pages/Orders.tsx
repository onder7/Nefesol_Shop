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
          <div className="space-y-1">
            {Number(order.discount) > 0 && (
              <>
                <p className="text-sm text-muted-foreground line-through">{formatPrice(order.subtotal + order.shippingFee)}</p>
                <p className="text-green-600 text-sm font-medium">−{formatPrice(order.discount)}</p>
              </>
            )}
            <p className="font-semibold">{formatPrice(order.total)}</p>
          </div>
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

  // Fiyatlar KDV hariç (net). KDV = Toplam − Kargo − (Ara Toplam − İndirim)
  const netSubtotal = Number(order.subtotal);
  const orderDiscount = Number(order.discount);
  const orderShipping = Number(order.shippingFee);
  const orderTotal = Number(order.total);
  const orderKdv = Math.max(0, Math.round((orderTotal - orderShipping - (netSubtotal - orderDiscount)) * 100) / 100);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link to="/hesabim/siparisler" className="hover:text-foreground">Siparişlerim</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">#{order.id.slice(-8).toUpperCase()}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Sipariş #{order.id.slice(-8).toUpperCase()}</h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Items */}
      <div className="border rounded-lg divide-y mb-8">
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

      {/* 4 Column Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Sipariş Özeti */}
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm font-semibold mb-4">Sipariş Özeti</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ara Toplam (KDV Hariç)</span>
              <span className="font-medium">{formatPrice(netSubtotal)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="text-muted-foreground">İndirim</span>
                <span className="font-medium">−{formatPrice(orderDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">KDV</span>
              <span className="font-medium">{formatPrice(orderKdv)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kargo</span>
              <span className="font-medium">{orderShipping === 0 ? 'Ücretsiz' : formatPrice(orderShipping)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Toplam</span>
              <span>{formatPrice(orderTotal)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Teslimat Adresi */}
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm font-semibold mb-4">Teslimat Adresi</p>
          {addr ? (
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">{addr.firstName} {addr.lastName}</p>
              <p>{addr.address}</p>
              <p>{addr.district} / {addr.city}</p>
              <div className="pt-2 border-t text-xs mt-3">
                <p className="text-muted-foreground">Sipariş Tarihi</p>
                <p className="font-medium text-foreground">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Adres bilgisi yok</p>
          )}
        </div>

        {/* Card 3: Kargo Bilgileri */}
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Kargo Bilgileri</p>
          </div>
          {order.shipping ? (
            <div className="text-sm text-muted-foreground space-y-2">
              {order.shipping.carrier && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Kargo Firması</p>
                  <p className="font-medium text-foreground">{order.shipping.carrier}</p>
                </div>
              )}
              {order.shipping.trackingNumber ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Takip No</p>
                  <p className="font-mono font-medium text-foreground">{order.shipping.trackingNumber}</p>
                </div>
              ) : (
                <p className="text-xs italic">Takip numarası henüz girilmedi.</p>
              )}
              {order.shipping.estimatedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tahmini Teslimat</p>
                  <p className="font-medium text-foreground">{formatDate(order.shipping.estimatedAt)}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Kargo bilgisi henüz yok</p>
          )}
        </div>

        {/* Card 4: Sipariş Geçmişi */}
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm font-semibold mb-4">Sipariş Geçmişi</p>
          {(order as unknown as { statusHistory?: Array<{ id: string; status: string; note?: string; createdAt: string }> }).statusHistory && (
            <div className="text-sm space-y-2">
              {((order as unknown as { statusHistory: Array<{ id: string; status: string; note?: string; createdAt: string }> }).statusHistory).slice(-3).map((log, i) => (
                <div key={log.id}>
                  <div className="flex items-center justify-between mb-1">
                    <StatusBadge status={log.status} />
                    <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                  </div>
                  {log.note && <p className="text-xs text-muted-foreground ml-0">{log.note}</p>}
                  {i < 2 && <div className="h-px bg-border mt-2" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Status */}
      {cancellation && (
        <div className="mb-8">
          <CancellationStatus
            status={cancellation.status}
            reason={cancellation.reason}
            orderId={orderId}
            couponOffered={cancellation.couponCode ? true : false}
            couponCode={cancellation.couponCode}
            couponValue={cancellation.couponValue ? Number(cancellation.couponValue) : undefined}
            adminNotes={cancellation.adminNotes}
            onRetract={() => {
              qc.invalidateQueries({ queryKey: ['order-cancellation', orderId] });
              refetch();
            }}
          />
        </div>
      )}

      {/* Cancel Request Button */}
      {!cancellation && ['PENDING', 'PROCESSING'].includes(order.status) && (
        <div className="border rounded-lg p-4 mb-8 bg-blue-50 border-blue-200 flex items-start justify-between">
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
