import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Trash2, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cartApi } from '@/services/cartApi';
import { productApi } from '@/services/productApi';
import { useCartStore } from '@/store/cartStore';
import type { Cart as CartType } from '@/types';
import { toast } from 'sonner';

function formatPrice(price: number) {
  return price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export function Cart() {
  const { setCart } = useCartStore();
  const qc = useQueryClient();

  const { data: cart, isLoading } = useQuery<CartType | null>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await cartApi.get();
      return (res.data.data as CartType | null) ?? null;
    },
  });

  const { data: shippingConfig } = useQuery({
    queryKey: ['shipping-config'],
    queryFn: () => productApi.shippingConfig().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const SHIPPING_FEE = shippingConfig?.shippingFee ?? 49.9;
  const FREE_THRESHOLD = shippingConfig?.freeShippingThreshold ?? 500;

  useEffect(() => {
    if (cart !== undefined) setCart(cart);
  }, [cart, setCart]);

  const updateMut = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateItem(itemId, quantity),
    onSuccess: (res) => {
      setCart(res.data.data);
      qc.setQueryData(['cart'], res.data.data);
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const removeMut = useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: (res) => {
      setCart(res.data.data);
      qc.setQueryData(['cart'], res.data.data);
    },
    onError: () => toast.error('Kaldırma başarısız'),
  });

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Sepetim</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="container mx-auto px-4 py-24 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sepetiniz boş</h1>
        <p className="text-muted-foreground mb-6">Alışverişe başlamak için ürünlere göz atın.</p>
        <Button render={<Link to="/ara" />}>Alışverişe Başla</Button>
      </main>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const shipping = subtotal >= FREE_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;
  const remaining = FREE_THRESHOLD - subtotal;
  const isPending = updateMut.isPending || removeMut.isPending;

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Sepetim</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Ürün listesi */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const img = item.variant.product.images?.[0];
            const attrs = item.variant.attributes as Record<string, string>;
            return (
              <div key={item.id} className="flex gap-4 border rounded-lg p-4">
                <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-50 flex-shrink-0">
                  {img ? (
                    <img src={img.url} alt={item.variant.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/urun/${item.variant.product.slug}`}
                    className="font-medium hover:text-primary line-clamp-2"
                  >
                    {item.variant.product.name}
                  </Link>
                  {Object.keys(attrs).length > 0 && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                    </p>
                  )}
                  <p className="font-semibold text-primary mt-1">{formatPrice(item.priceAtAdd)}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeMut.mutate(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    disabled={isPending}
                    aria-label="Kaldır"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isPending}
                      onClick={() => {
                        if (item.quantity === 1) removeMut.mutate(item.id);
                        else updateMut.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isPending || item.quantity >= item.variant.stockQty}
                      onClick={() => updateMut.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <p className="text-sm font-medium">{formatPrice(item.priceAtAdd * item.quantity)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sipariş özeti */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-6 space-y-4 sticky top-20">
            <h2 className="font-semibold text-lg">Sipariş Özeti</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ara Toplam</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kargo</span>
                <span>{shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}</span>
              </div>
              {shipping > 0 && remaining > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Truck className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatPrice(remaining)} daha ekleyin, kargo ücretsiz!</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, (subtotal / FREE_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {shipping === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span>Ücretsiz kargo hakkı kazandınız!</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4 flex justify-between font-semibold text-base">
              <span>Toplam</span>
              <span>{formatPrice(total)}</span>
            </div>

            <Button className="w-full" size="lg" render={<Link to="/odeme" />}>
              Siparişi Tamamla
            </Button>
            <Button variant="outline" className="w-full" render={<Link to="/ara" />}>
              Alışverişe Devam Et
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
