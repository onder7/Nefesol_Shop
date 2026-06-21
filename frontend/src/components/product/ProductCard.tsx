import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '@/types';
import { Heart } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';
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

  // Calculate discount
  const discount = cheapestVariant && cheapestVariant.compareAt
    ? Math.round(((Number(cheapestVariant.compareAt) - Number(cheapestVariant.price)) / Number(cheapestVariant.compareAt)) * 100)
    : 0;

  const { isFavorite, toggleFavorite } = useWishlistStore();
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

  return (
    <Link to={`/urun/${product.slug}`} className="group flex flex-col gap-2 bg-transparent text-left border-none shadow-none">
      {/* Görsel Kutusu */}
      <div className="w-full aspect-[4/5] bg-[#F4F4F4] relative flex items-center justify-center overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.altText ?? product.name}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
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
      <div className="flex flex-col gap-0.5">
        {/* Kategori Adı */}
        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
          {product.category?.name}
        </span>

        {/* Ürün Adı */}
        <h3 className="text-sm font-bold text-neutral-900 group-hover:text-primary transition-colors line-clamp-1">
          {product.name}
        </h3>

        {/* Kampanya Badgeleri */}
        <div className="mt-0.5">
          <CampaignBadges />
        </div>

        {/* Fiyat (KDV dahil) */}
        <span className="text-sm font-semibold text-neutral-800 mt-1">
          {cheapestVariant
            ? formatPrice(
                product.vatIncluded
                  ? Number(cheapestVariant.price)
                  : Number(cheapestVariant.price) * (1 + product.vatRate / 100),
              )
            : 'Fiyat yok'}
        </span>
      </div>
    </Link>
  );
}
