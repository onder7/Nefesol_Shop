import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlistStore } from '@/store/wishlistStore';
import { ProductGrid } from '@/components/product/ProductGrid';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';

export function Favorites() {
  const { items, isLoading, fetchWishlist } = useWishlistStore();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const products = items
    .map((item) => item.variant?.product)
    .filter(Boolean); // Filter out any null/undefined products

  return (
    <main className="container mx-auto px-4 py-12 flex-grow">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Favorilerim</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Beğendiğiniz ve daha sonra satın almak için kaydettiğiniz tüm ürünler.
          </p>
        </div>

        {isLoading && !products.length ? (
          <ProductGrid products={[]} loading={true} cols={4} />
        ) : !products.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-neutral-100 p-8 shadow-xs">
            <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
              <Heart className="h-10 w-10 fill-red-50" />
            </div>
            <h2 className="text-xl font-bold text-neutral-800">Favori listeniz boş</h2>
            <p className="text-neutral-500 text-sm max-w-sm mt-2 mb-8">
              Henüz hiçbir ürünü favorilerinize eklemediniz. Ürünleri inceleyerek beğendiklerinizi favorilerinize ekleyebilirsiniz.
            </p>
            <Link to="/ara" className={cn(buttonVariants({ size: 'lg' }))}>
              Ürünleri Keşfet
            </Link>
          </div>
        ) : (
          <ProductGrid products={products} cols={4} />
        )}
      </div>
    </main>
  );
}
export default Favorites;
