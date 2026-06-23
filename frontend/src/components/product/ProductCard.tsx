import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '@/types';
import { Heart, Star, ShoppingCart } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { cartApi } from '@/services/cartApi';
import { toast } from 'sonner';
import { CampaignBadges } from '@/components/common/CampaignDisplay';

interface Props {
  product: Product;
}

function formatPrice(price: number | string): string {
  return Number(price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export function ProductCard({ product }: Props) {
  const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
  const cheapestVariant = product.variants?.reduce((min, v) =>
    Number(v.price) < Number(min.price) ? v : min, product.variants[0]);
  const inStock = product.variants?.some((v) => v.stockQty > 0);

  // İndirim oranı
  const discount = cheapestVariant && cheapestVariant.compareAt
    ? Math.round(((Number(cheapestVariant.compareAt) - Number(cheapestVariant.price)) / Number(cheapestVariant.compareAt)) * 100)
    : 0;

  // Ortalama puan
  const ratings = product.reviews?.map((r) => r.rating) ?? [];
  const reviewCount = product._count?.reviews ?? ratings.length;
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  // KDV dahil fiyat
  const grossPrice = cheapestVariant
    ? (product.vatIncluded ? Number(cheapestVariant.price) : Number(cheapestVariant.price) * (1 + product.vatRate / 100))
    : 0;

  const { isFavorite, toggleFavorite } = useWishlistStore();
  const { setCart } = useCartStore();
  const fav = isFavorite(product.id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.isGuest || !user) {
      toast.info('Favorilere eklemek için üye olmanız gerekiyor.');
      navigate('/kayit');
      return;
    }
    await toggleFavorite(product.id);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cheapestVariant || !inStock) return;
    try {
      const res = await cartApi.addItem(cheapestVariant.id, 1);
      setCart(res.data.data);
      toast.success('Ürün sepete eklendi!');
    } catch {
      toast.error('Sepete eklenemedi.');
    }
  };

  return (
    <Link
      to={`/urun/${product.slug}`}
      className="group flex flex-col rounded-lg border border-neutral-200 bg-white overflow-hidden text-left hover:shadow-lg hover:border-neutral-300 transition-all duration-200"
    >
      {/* Görsel Kutusu */}
      <div className="relative aspect-[4/5] bg-[#F4F4F4] flex items-center justify-center overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.altText ?? product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <span className="text-neutral-400 text-xs font-semibold">Görsel Yok</span>
        )}

        {/* İndirim Badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-red-600 text-white px-2 py-1 rounded-sm shadow-md">
            <span className="text-xs font-bold">-%{discount}</span>
          </div>
        )}

        {/* Favori */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/90 backdrop-blur-xs shadow-xs text-neutral-600 hover:text-red-500 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-neutral-100"
          aria-label="Favorilere Ekle"
        >
          <Heart className={`h-4.5 w-4.5 transition-colors ${fav ? 'fill-red-500 text-red-500' : 'text-neutral-600'}`} />
        </button>

        {!inStock && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded-xs">
              Stok Yok
            </span>
          </div>
        )}
      </div>

      {/* Detaylar */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        {/* Kampanya / Kupon rozeti */}
        <div className="flex justify-center">
          <CampaignBadges />
        </div>

        {/* Ürün Adı (marka + ad, 2 satır) */}
        <h3 className="text-sm text-neutral-800 group-hover:text-primary transition-colors line-clamp-2 leading-snug min-h-[2.5rem]">
          {product.brand?.name && <span className="font-bold">{product.brand.name} </span>}
          {product.name}
        </h3>

        {/* Puan */}
        {avgRating !== null && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-neutral-700">
              {avgRating.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-neutral-400">({reviewCount})</span>
          </div>
        )}

        {/* Fiyat (KDV dahil) + Sepete Ekle */}
        <div className="flex items-end justify-between mt-auto pt-1">
          <span className="text-lg font-extrabold text-neutral-900">
            {cheapestVariant ? formatPrice(grossPrice) : 'Fiyat yok'}
          </span>
          {inStock && (
            <button
              onClick={handleAddToCart}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-primary hover:text-white hover:border-primary active:scale-95 transition-all cursor-pointer"
              aria-label="Sepete Ekle"
            >
              <ShoppingCart className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
