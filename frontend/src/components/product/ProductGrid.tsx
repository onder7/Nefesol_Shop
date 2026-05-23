import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  loading?: boolean;
  cols?: 2 | 3 | 4;
}

const colClass = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4' };

export function ProductGrid({ products, loading = false, cols = 4 }: Props) {
  if (loading) {
    return (
      <div className={`grid ${colClass[cols]} gap-4`}>
        {Array.from({ length: cols * 2 }).map((_, i) => (
          <div key={i} className="border rounded-xl overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-6 w-1/2 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">Ürün bulunamadı</p>
      </div>
    );
  }

  return (
    <div className={`grid ${colClass[cols]} gap-4`}>
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
