import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { checkoutApi } from '@/services/checkoutApi';
import { useCartStore } from '@/store/cartStore';
import { useEffect } from 'react';

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export function OrderSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const { setCart } = useCartStore();

  // Clear cart in store after successful order
  useEffect(() => { setCart(null); }, [setCart]);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await checkoutApi.getOrder(orderId);
      return res.data.data;
    },
    enabled: !!orderId,
  });

  if (!orderId) {
    return (
      <main className="container mx-auto px-4 py-24 text-center">
        <p className="text-muted-foreground">Geçersiz sayfa.</p>
        <Button render={<Link to="/" />} className="mt-4">Ana Sayfaya Dön</Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-16 max-w-lg text-center">
      <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-2">Siparişiniz Alındı!</h1>
      <p className="text-muted-foreground mb-1">
        Sipariş No: <strong className="text-foreground">#{orderId.slice(-8).toUpperCase()}</strong>
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        Sipariş onayı e-posta adresinize gönderildi.
      </p>

      {isLoading ? (
        <div className="space-y-3 text-left border rounded-lg p-4 mb-6">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
        </div>
      ) : order ? (
        <div className="border rounded-lg p-4 mb-6 text-left space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4 text-primary" />
            Sipariş Detayı
          </div>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {(item.variant as { product: { name: string } }).product.name} × {item.quantity}
              </span>
              <span>{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Toplam</span>
            <span>{formatPrice(Number(order.total))}</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button render={<Link to="/hesabim/siparisler" />}>
          <Package className="h-4 w-4 mr-2" />
          Siparişlerim
        </Button>
        <Button variant="outline" render={<Link to="/" />}>
          <ShoppingBag className="h-4 w-4 mr-2" />
          Alışverişe Devam
        </Button>
      </div>
    </main>
  );
}
