import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { productApi } from '@/services/productApi';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SORTS = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşük → Yüksek' },
  { value: 'price_desc', label: 'Fiyat: Yüksek → Düşük' },
  { value: 'popular', label: 'En Popüler' },
];

type Sort = 'newest' | 'price_asc' | 'price_desc' | 'popular';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);

  const { data: catData } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => productApi.category(slug!),
    enabled: !!slug,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', { category: slug, sort, page }],
    queryFn: () => productApi.list({ category: slug, sort, page, limit: 20 }),
    enabled: !!slug,
  });

  const category = catData?.data?.data;
  const products = data?.data?.items ?? [];
  const pagination = data?.data?.pagination;

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Ana Sayfa</Link>
        <ChevronRight className="h-4 w-4" />
        {category?.parent && (
          <>
            <Link to={`/kategori/${category.parent.slug}`} className="hover:text-foreground">
              {category.parent.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-foreground font-medium">{category?.name ?? slug}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{category?.name ?? slug}</h1>
        <div className="flex items-center gap-2">
          {pagination && (
            <span className="text-sm text-muted-foreground">{pagination.total} ürün</span>
          )}
          <Select value={sort} onValueChange={(v) => { setSort(v as Sort); setPage(1); }}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alt kategoriler */}
      {category?.children && category.children.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {category.children.map((child) => (
            <Button
              key={child.id}
              variant="outline"
              size="sm"
              render={<Link to={`/kategori/${child.slug}`} />}
            >
              {child.name}
            </Button>
          ))}
        </div>
      )}

      <ProductGrid products={products} loading={isLoading} cols={4} />

      {/* Sayfalama */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Önceki
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}
    </main>
  );
}
