import { useState, useEffect, useCallback } from 'react';
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
import { SeoHead, SITE_URL } from '@/components/seo/SeoHead';
import { productSchema, breadcrumbSchema } from '@/lib/schemas';
import { useSocialLinks } from '@/hooks/useSocialLinks';

const WA_NUMBER_FALLBACK = import.meta.env.VITE_WHATSAPP_NUMBER ?? '905551234567';

function ProductShareBar({ name, url }: { name: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const encodedUrl  = encodeURIComponent(url);
  const encodedText = encodeURIComponent(name + ' — MaBridge Global');

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [url]);

  const shares = [
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(name + '\n' + url)}`,
      bg: 'hover:bg-[#25D366]/10 hover:border-[#25D366]/40 hover:text-[#25D366]',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 32 32">
          <path d="M16.003 3C9.375 3 4 8.373 4 15.001c0 2.118.553 4.107 1.518 5.837L4 29l8.38-1.495A12.94 12.94 0 0016.003 28c6.628 0 12.003-5.373 12.003-12.001S22.631 3 16.003 3zm5.97 16.774c-.327-.163-1.935-.955-2.234-1.065-.3-.109-.517-.163-.735.163-.218.328-.844 1.065-.935 1.065-.163 0-.327-.054-.49-.163-.327-.163-1.38-.508-2.625-1.62-.97-.866-1.625-1.937-1.815-2.265-.19-.327-.02-.503.144-.666.147-.147.327-.382.49-.572.164-.19.219-.327.328-.545.109-.218.054-.41-.027-.572-.082-.163-.735-1.774-1.008-2.427-.264-.635-.537-.545-.735-.556h-.626c-.218 0-.572.082-.872.41-.3.327-1.143 1.118-1.143 2.727s1.17 3.162 1.333 3.38c.163.218 2.302 3.514 5.58 4.93.78.336 1.388.536 1.863.687.783.25 1.496.214 2.059.13.628-.094 1.935-.79 2.208-1.554.273-.763.273-1.417.19-1.554-.08-.136-.3-.218-.626-.382z"/>
        </svg>
      ),
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bg: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
        </svg>
      ),
    },
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      bg: 'hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.254 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`,
      bg: 'hover:bg-red-50 hover:border-red-200 hover:text-red-600',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs text-muted-foreground shrink-0">Paylaş:</span>
      <div className="flex items-center gap-1.5">
        {shares.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${s.label}'da paylaş`}
            className={`flex items-center justify-center h-8 w-8 rounded-full border border-border text-muted-foreground transition-all ${s.bg}`}
          >
            {s.icon}
          </a>
        ))}

        {/* Link kopyala */}
        <button
          type="button"
          title="Linki kopyala"
          onClick={copy}
          className={`flex items-center justify-center h-8 w-8 rounded-full border transition-all ${
            copied
              ? 'border-green-300 bg-green-50 text-green-600'
              : 'border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/40'
          }`}
        >
          {copied ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
      {copied && (
        <span className="text-xs text-green-600 animate-in fade-in slide-in-from-left-1 duration-150">
          Kopyalandı!
        </span>
      )}
    </div>
  );
}

function buildWhatsAppUrl(
  phone: string,
  product: { name: string },
  variant: { price: number | string; attributeValues?: { attributeValue: { value: string; attribute: { name: string } } }[] } | null,
  qty: number,
) {
  const attrs = variant?.attributeValues
    ?.map((av) => `${av.attributeValue.attribute.name}: ${av.attributeValue.value}`)
    .join(', ') ?? '';
  const price = variant ? Number(variant.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }) : '';
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const msg = [
    `Merhaba, aşağıdaki ürünü sipariş vermek istiyorum:`,
    `\u{1F4E6} Ürün: ${product.name}`,
    attrs ? `\u{1F516} Seçenek: ${attrs}` : '',
    `\u{1F4B0} Fiyat: ${price}`,
    `\u{1F522} Adet: ${qty}`,
    url ? `\u{1F517} Ürün Linki: ${url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
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

  const { data: socialLinks } = useSocialLinks();
  const waNumber = socialLinks?.whatsapp
    ? socialLinks.whatsapp.replace(/\D/g, '')
    : WA_NUMBER_FALLBACK;

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

  // Üründeki tüm attribute'ları sortOrder'a göre sıralı topla
  const attributeMap = new Map<string, { id: string; name: string; sortOrder: number }>();
  product.variants.forEach((v) =>
    v.attributeValues?.forEach(({ attributeValue: av }) => {
      if (!attributeMap.has(av.attribute.id)) attributeMap.set(av.attribute.id, av.attribute);
    })
  );
  const attributeKeys = [...attributeMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  const primaryImage =
    product.images?.find((img) => img.isPrimary) ?? product.images?.[0];

  return (
    <main className="container mx-auto px-4 py-8">
      <SeoHead
        title={product.name}
        description={
          product.description
            ? product.description.slice(0, 155)
            : `${product.name} — ${product.category.name} kategorisinde en iyi fiyatlarla. Hızlı kargo, kolay iade.`
        }
        keywords={[
          product.name,
          product.category.name,
          product.brand?.name,
          'satın al',
          'fiyat',
          'ev tekstili',
        ]
          .filter(Boolean)
          .join(', ')}
        image={primaryImage?.url}
        url={`${SITE_URL}/urun/${product.slug}`}
        type="product"
        schema={[
          productSchema(product),
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: SITE_URL },
            {
              name: product.category.name,
              url: `${SITE_URL}/kategori/${product.category.slug}`,
            },
            { name: product.name, url: `${SITE_URL}/urun/${product.slug}` },
          ]),
        ]}
      />
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
          <div className="relative">
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

            {/* Favori butonu — resmin sağ üst köşesi */}
            <button
              type="button"
              title={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              onClick={() => toggleFavorite(product.id)}
              className={`absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
                fav
                  ? 'bg-red-500 hover:bg-red-600 text-white scale-110'
                  : 'bg-white/90 backdrop-blur-sm text-neutral-400 hover:text-red-400 hover:bg-white hover:scale-110'
              }`}
            >
              <Heart className={`h-5 w-5 transition-all duration-200 ${fav ? 'fill-white' : ''}`} />
            </button>
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
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  {product.vatIncluded
                    ? formatPrice(variant.price)
                    : formatPrice(Number(variant.price) * (1 + product.vatRate / 100))}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(variant.compareAt!)}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {product.vatIncluded
                  ? `KDV Dahil (%${product.vatRate}) · KDV Hariç: ${formatPrice(Number(variant.price) / (1 + product.vatRate / 100))}`
                  : `KDV Hariç · KDV Dahil (%${product.vatRate}): ${formatPrice(Number(variant.price) * (1 + product.vatRate / 100))}`
                }
              </p>
            </div>
          )}

          {/* Varyantlar */}
          {attributeKeys.map((attr) => {
            const uniqueValues = [
              ...new Map(
                product.variants
                  .flatMap((v) => v.attributeValues ?? [])
                  .filter(({ attributeValue: av }) => av.attribute.id === attr.id)
                  .map(({ attributeValue: av }) => [av.id, av])
              ).values(),
            ].sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <div key={attr.id}>
                <p className="text-sm font-medium mb-2">{attr.name}</p>
                <div className="flex flex-wrap gap-2">
                  {uniqueValues.map((av) => {
                    // Önce mevcut diğer attribute seçimlerini koruyarak bu değere uyan varyantı bul
                    const matchVariant = (() => {
                      const perfect = product.variants.find((pv) => {
                        if (!pv.attributeValues?.some((x) => x.attributeValue.id === av.id)) return false;
                        for (const { attributeValue: curAv } of variant?.attributeValues ?? []) {
                          if (curAv.attribute.id === attr.id) continue;
                          if (!pv.attributeValues?.some((x) => x.attributeValue.id === curAv.id)) return false;
                        }
                        return true;
                      });
                      return perfect ?? product.variants.find((pv) =>
                        pv.attributeValues?.some((x) => x.attributeValue.id === av.id)
                      );
                    })();
                    const isSelected = variant?.attributeValues?.some((x) => x.attributeValue.id === av.id);
                    return (
                      <button
                        key={av.id}
                        onClick={() => matchVariant && setSelectedVariant(matchVariant)}
                        className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                          isSelected ? 'border-primary bg-primary/5 font-medium' : 'hover:border-muted-foreground'
                        } ${matchVariant?.stockQty === 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                        disabled={matchVariant?.stockQty === 0}
                      >
                        {attr.inputType === 'color' && av.colorHex ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-200 inline-block shrink-0" style={{ backgroundColor: av.colorHex }} />
                            {av.value}
                          </span>
                        ) : (
                          av.value
                        )}
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
          </div>

          {/* WhatsApp Sipariş */}
          <a
            href={buildWhatsAppUrl(waNumber, product, variant, qty)}
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

          {/* Sosyal Medya Paylaşım */}
          <ProductShareBar
            name={product.name}
            url={typeof window !== 'undefined' ? window.location.href : `${SITE_URL}/urun/${product.slug}`}
          />

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
