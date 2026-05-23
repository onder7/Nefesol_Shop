import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ShoppingCart, Star, Minus, Plus, Heart } from 'lucide-react';
import { productApi } from '@/services/productApi';
import { cartApi } from '@/services/cartApi';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { ProductVariant } from '@/types';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductQA } from '@/components/product/ProductQA';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '905551234567';

function buildWhatsAppUrl(product: { name: string }, variant: { price: number | string; attributes?: Record<string, string> } | null, qty: number) {
  const attrs = variant?.attributes
    ? Object.entries(variant.attributes as Record<string, string>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';
  const price = variant ? Number(variant.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }) : '';
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const msg = [
    `Merhaba, aşağıdaki ürünü sipariş vermek istiyorum:`,
    `📦 Ürün: ${product.name}`,
    attrs ? `🔖 Seçenek: ${attrs}` : '',
    `💰 Fiyat: ${price}`,
    `🔢 Adet: ${qty}`,
    url ? `🔗 Ürün Linki: ${url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function formatPrice(price: number | string): string {
  return Number(price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'reviews' | 'qa'>('reviews');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const { setCart } = useCartStore();
  const qc = useQueryClient();
  const { isFavorite, toggleFavorite } = useWishlistStore();
  const addToRecentlyViewed = useRecentlyViewedStore((s) => s.add);

  const addToCartMut = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      cartApi.addItem(variantId, quantity),
    onSuccess: (res) => {
      setCart(res.data.data);
      qc.setQueryData(['cart'], res.data.data);
      toast.success('Ürün sepete eklendi!');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Sepete eklenemedi');
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.get(slug!),
    enabled: !!slug,
  });

  const product = data?.data?.data;

  useEffect(() => {
    if (product) addToRecentlyViewed(product);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (product?.images?.length) {
      const idx = product.images.findIndex((img) => img.isPrimary);
      setActiveImageIdx(idx >= 0 ? idx : 0);
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fav = product ? isFavorite(product.id) : false;
  const variant = selectedVariant ?? product?.variants?.[0] ?? null;
  const activeImage = product?.images?.[activeImageIdx] ?? product?.images?.[0];
  const hasDiscount = variant?.compareAt && Number(variant.compareAt) > Number(variant.price);
  const avgRating = product?.reviews?.length
    ? (product.reviews as { rating: number }[]).reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : null;

  if (isLoading) return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </main>
  );

  if (isError || !product) return (
    <main className="container mx-auto px-4 py-24 text-center">
      <p className="text-xl text-muted-foreground">Ürün bulunamadı.</p>
      <Button render={<Link to="/" />} className="mt-4">Ana Sayfaya Dön</Button>
    </main>
  );

  const attributeKeys = [...new Set(product.variants.flatMap((v) => Object.keys(v.attributes as Record<string, string>)))];

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Ana Sayfa</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/kategori/${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Görsel Galerisi */}
        <div className="space-y-3">
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-50">
            {activeImage ? (
              <img
                src={activeImage.url}
                alt={activeImage.altText ?? product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Görsel yok</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImageIdx(i)}
                  className={`shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImageIdx
                      ? 'border-primary'
                      : 'border-transparent hover:border-muted-foreground/50'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.altText ?? `Görsel ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bilgi */}
        <div className="space-y-4">
          {product.brand && <p className="text-sm text-muted-foreground">{product.brand.name}</p>}
          <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>

          {avgRating !== null && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-muted-foreground">({(product.reviews as { rating: number }[]).length} değerlendirme)</span>
            </div>
          )}

          {/* Fiyat */}
          {variant && (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{formatPrice(variant.price)}</span>
              {hasDiscount && (
                <span className="text-lg text-muted-foreground line-through">{formatPrice(variant.compareAt!)}</span>
              )}
            </div>
          )}

          {/* Varyantlar */}
          {attributeKeys.map((key) => {
            const values = [...new Set(product.variants.map((v) => (v.attributes as Record<string, string>)[key]))];
            return (
              <div key={key}>
                <p className="text-sm font-medium mb-2 capitalize">{key}</p>
                <div className="flex flex-wrap gap-2">
                  {values.map((val) => {
                    const v = product.variants.find((pv) => (pv.attributes as Record<string, string>)[key] === val);
                    const isSelected = variant && (variant.attributes as Record<string, string>)[key] === val;
                    return (
                      <button
                        key={val}
                        onClick={() => v && setSelectedVariant(v)}
                        className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                          isSelected ? 'border-primary bg-primary/5 font-medium' : 'hover:border-muted-foreground'
                        } ${v?.stockQty === 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                        disabled={v?.stockQty === 0}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Stok */}
          {variant && (
            <Badge variant={variant.stockQty > 0 ? 'default' : 'destructive'}>
              {variant.stockQty > 0 ? `Stokta ${variant.stockQty} adet` : 'Stok Yok'}
            </Badge>
          )}

          {/* Miktar + Sepet */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center border rounded-lg">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQty((q) => Math.min(variant?.stockQty ?? 1, q + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="flex-1"
              disabled={!variant || variant.stockQty === 0 || addToCartMut.isPending}
              onClick={() => variant && addToCartMut.mutate({ variantId: variant.id, quantity: qty })}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {addToCartMut.isPending ? 'Ekleniyor...' : 'Sepete Ekle'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => toggleFavorite(product.id)}
            >
              <Heart className={`h-5 w-5 transition-colors ${fav ? 'fill-red-500 text-red-500' : 'text-neutral-600'}`} />
            </Button>
          </div>

          {/* WhatsApp Sipariş */}
          <a
            href={buildWhatsAppUrl(product, variant, qty)}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2.5 w-full rounded-lg py-3 px-5 text-sm font-semibold text-white transition-all ${
              variant && variant.stockQty > 0
                ? 'bg-[#25D366] hover:bg-[#1ebe5a] active:bg-[#18a84d] shadow-sm hover:shadow-md'
                : 'bg-gray-300 pointer-events-none'
            }`}
          >
            {/* WhatsApp SVG icon */}
            <svg viewBox="0 0 32 32" className="h-5 w-5 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.003 3C9.375 3 4 8.373 4 15.001c0 2.118.553 4.107 1.518 5.837L4 29l8.38-1.495A12.94 12.94 0 0016.003 28c6.628 0 12.003-5.373 12.003-12.001S22.631 3 16.003 3zm0 21.999a10.92 10.92 0 01-5.582-1.531l-.4-.237-4.147.74.763-4.02-.26-.416A10.955 10.955 0 015.002 15c0-6.075 4.926-11 10.999-11C22.074 4 27 8.925 27 15s-4.926 11-10.997 11zm5.97-8.225c-.327-.163-1.935-.955-2.234-1.065-.3-.109-.517-.163-.735.163-.218.328-.844 1.065-.935 1.065-.163 0-.327-.054-.49-.163-.327-.163-1.38-.508-2.625-1.62-.97-.866-1.625-1.937-1.815-2.265-.19-.327-.02-.503.144-.666.147-.147.327-.382.49-.572.164-.19.219-.327.328-.545.109-.218.054-.41-.027-.572-.082-.163-.735-1.774-1.008-2.427-.264-.635-.537-.545-.735-.556h-.626c-.218 0-.572.082-.872.41-.3.327-1.143 1.118-1.143 2.727s1.17 3.162 1.333 3.38c.163.218 2.302 3.514 5.58 4.93.78.336 1.388.536 1.863.687.783.25 1.496.214 2.059.13.628-.094 1.935-.79 2.208-1.554.273-.763.273-1.417.19-1.554-.08-.136-.3-.218-.626-.382z"/>
            </svg>
            WhatsApp ile Sipariş Ver
          </a>

          {product.description && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Ürün Açıklaması</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Değerlendirmeler & Sorular Sekmesi ── */}
      <div className="mt-12">
        {/* Sekme Başlıkları */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'reviews'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Değerlendirmeler
            {product._count?.reviews ? (
              <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {product._count.reviews}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'qa'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Soru &amp; Cevap
          </button>
        </div>

        {/* Sekme İçeriği */}
        <div className="py-8">
          {activeTab === 'reviews' ? (
            <ProductReviews productId={product.id} />
          ) : (
            <ProductQA productId={product.id} />
          )}
        </div>
      </div>

      {/* Son görüntülenen ürünler */}
      <div className="mt-12">
        <RecentlyViewed excludeId={product.id} />
      </div>
    </main>
  );
}
