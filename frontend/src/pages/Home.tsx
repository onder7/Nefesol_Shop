import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productApi } from '@/services/productApi';
import { api } from '@/services/api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { buttonVariants } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  RotateCcw,
  Headphones,
  ShieldCheck,
  Flame,
  ArrowRight
} from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { organizationSchema, websiteSchema } from '@/lib/schemas';
import { CampaignBanner } from '@/components/common/CampaignDisplay';
import { useStoreInfo } from '@/hooks/useStoreInfo';



const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'nevresim-takimlari': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600',
  'ceyizlik-urunler': 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600',
  'yatak-ortuleri': 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600',
  'pike-takimlari': 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600',
  'banyo': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600',
  'masa-ortuleri': 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600',
  'battaniye': 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=600',
  'carsaf-alez': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600',
  'hali': 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600',
  'yastik-yorgan': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600',
};

const CATEGORY_TAG_MAP: Record<string, string> = {
  'nevresim-takimlari': 'Yatak Odası',
  'ceyizlik-urunler': 'Çeyiz Setleri',
  'yatak-ortuleri': 'Lüks Seri',
  'pike-takimlari': 'Bahar Koleksiyonu',
  'banyo': 'Banyo & Bornoz',
  'masa-ortuleri': 'Masa Örtüsü',
  'battaniye': 'Sıcak Dokunuş',
  'carsaf-alez': 'Yatak Koruyucu',
  'hali': 'Ev Dekorasyon',
  'yastik-yorgan': 'Sağlıklı Uyku',
};

const DEFAULT_CATEGORY_IMAGE = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600';

export function Home() {
  const { name: storeName } = useStoreInfo();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bannerCampaign, setBannerCampaign] = useState<any | null>(null);

  // Fetch banner campaign
  useEffect(() => {
    const fetchBannerCampaign = async () => {
      try {
        const res = await api.get('/campaigns?isActive=true');
        const campaigns = res.data?.data || [];
        const banner = campaigns.find((c: any) => c.displayType === 'banner' && new Date(c.endDate) > new Date());
        if (banner) setBannerCampaign(banner);
      } catch (e) {
        console.error('Failed to fetch banner campaign:', e);
      }
    };
    fetchBannerCampaign();
  }, []);

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
  });
  const categories = categoriesData?.data?.data ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [dragMove, setDragMove] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
    setDragMove(0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
    setDragMove(Math.abs(x - startX));
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount),
        behavior: 'smooth',
      });
    }
  };

  const { data: slidesData } = useQuery({
    queryKey: ['homepage-slides'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { img: string; link: string }[] }>('/slides');
      return res.data.data;
    }
  });

  const slides = slidesData ?? [
    {
      img: "/banner-yaz.png",
      link: "/ara?search=yaz",
    },
    {
      img: "/banner-yilbasi.png",
      link: "/ara?search=yılbaşı",
    },
    {
      img: "/banner-sonbahar.png",
      link: "/ara?search=turuncu",
    }
  ];

  // Auto slide
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);



  const { data: featuredData, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productApi.featured(8),
    staleTime: 1000 * 60 * 5,
  });

  const { data: newArrivalsData, isLoading: isNewArrivalsLoading } = useQuery({
    queryKey: ['products', 'newest'],
    queryFn: () => productApi.list({ sort: 'newest', limit: 4 }),
  });

  const featured = featuredData?.data?.data ?? [];
  const newArrivals = newArrivalsData?.data?.items ?? [];


  const nextSlide = () => {
    if (slides.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }
  };
  const prevSlide = () => {
    if (slides.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  return (
    <main className="bg-neutral-50/50 pb-16">
      <SeoHead
        description={`Hızlı kargo, kolay iade ve uygun fiyat garantisiyle ${storeName} ürünlerini keşfedin.`}
        schema={[organizationSchema(storeName), websiteSchema(storeName)]}
      />
      {/* Hero Carousel */}
      <section className="relative overflow-hidden bg-white border-b border-neutral-100">
        <div className="relative w-full aspect-[2/1] overflow-hidden bg-neutral-100">
          {slides.map((slide, index) => (
            <Link
              key={index}
              to={slide.link}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={slide.img}
                alt={`Kampanya ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </Link>
          ))}
        </div>

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/80 backdrop-blur-xs shadow-md hover:bg-white text-neutral-700 hover:text-black transition-all cursor-pointer border border-neutral-200/50"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/80 backdrop-blur-xs shadow-md hover:bg-white text-neutral-700 hover:text-black transition-all cursor-pointer border border-neutral-200/50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                index === currentSlide ? 'w-8 bg-primary' : 'w-2.5 bg-neutral-300/80'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Avantajlar / Hizmet Kutuları */}
      <section className="container mx-auto px-4 py-8 mt-12 bg-white rounded-2xl shadow-xs border border-neutral-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex items-center gap-4 px-2">
            <div className="p-3.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-neutral-800 text-sm">Ücretsiz & Hızlı Kargo</h4>
              <p className="text-neutral-500 text-xs mt-1">750₺ üzeri alışverişlerinizde kargo bedava.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-2">
            <div className="p-3.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-neutral-800 text-sm">14 Gün Kolay İade</h4>
              <p className="text-neutral-500 text-xs mt-1">Koşulsuz iade ve kolay değişim garantisi.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-2">
            <div className="p-3.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-neutral-800 text-sm">7/24 Canlı Destek</h4>
              <p className="text-neutral-500 text-xs mt-1">Sorularınız için her an yardıma hazırız.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-2">
            <div className="p-3.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-neutral-800 text-sm">Güvenli Ödeme Altyapısı</h4>
              <p className="text-neutral-500 text-xs mt-1">256-bit SSL ve İyzico güvencesiyle ödeyin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Campaign Banner */}
      {bannerCampaign && (
        <section className="container mx-auto px-4 py-12">
          <CampaignBanner campaign={bannerCampaign} />
        </section>
      )}

      {/* Kategoriler (Slider) */}
      <section className="container mx-auto px-4 py-12 relative group/slider">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-800 tracking-tight">Kategoriler</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-full bg-white border border-neutral-200 shadow-xs hover:bg-neutral-50 text-neutral-700 hover:text-black cursor-pointer transition-colors"
              aria-label="Önceki Kampanya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-full bg-white border border-neutral-200 shadow-xs hover:bg-neutral-50 text-neutral-700 hover:text-black cursor-pointer transition-colors"
              aria-label="Sonraki Kampanya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={cn(
            "flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 sm:pb-3 md:pb-4 no-scrollbar select-none cursor-grab active:cursor-grabbing",
            isDragging && "scroll-auto"
          )}
        >
          {isCategoriesLoading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-[260px] sm:w-[280px] md:w-[320px] lg:w-[350px] shrink-0 snap-start rounded-2xl bg-neutral-200 animate-pulse h-80"
                />
              ))
            : categories.map((cat) => {
                const imageUrl = cat.imageUrl || CATEGORY_IMAGE_MAP[cat.slug] || DEFAULT_CATEGORY_IMAGE;
                const tag = CATEGORY_TAG_MAP[cat.slug] || 'Kategori';
                return (
                  <div
                    key={cat.id}
                    className="w-[260px] sm:w-[280px] md:w-[320px] lg:w-[350px] shrink-0 snap-start group relative overflow-hidden rounded-2xl bg-neutral-900 text-white p-8 h-80 flex flex-col justify-end shadow-xs"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
                    <img
                      src={imageUrl}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                      draggable="false"
                    />
                    <div className="relative z-20 pointer-events-none">
                      <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase">
                        {tag}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold mt-1 mb-1.5 text-white tracking-tight">
                        {cat.name}
                      </h3>
                      <p className="text-neutral-300 text-xs mb-5 font-medium leading-snug line-clamp-2">
                        {cat.description || `${cat.name} ürünlerini inceleyin.`}
                      </p>
                      <Link
                        to={`/kategori/${cat.slug}`}
                        className="pointer-events-auto text-white text-xs underline font-semibold hover:text-primary transition-colors inline-flex items-center gap-1.5"
                        onClick={(e) => {
                          if (dragMove > 5) e.preventDefault();
                        }}
                      >
                        Koleksiyonu Gör <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

      {/* Yeni Gelen Ürünler */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary fill-primary animate-pulse" />
            <h2 className="text-2xl font-bold text-neutral-800 tracking-tight">Yeni Gelenler</h2>
          </div>
          <Link to="/ara?sort=newest" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Tümünü Gör
          </Link>
        </div>
        <ProductGrid products={newArrivals} loading={isNewArrivalsLoading} cols={4} />
      </section>



      {/* Öne Çıkan Ürünler */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-800 tracking-tight">Öne Çıkan Ürünler</h2>
          <Link to="/ara" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Tümünü Gör
          </Link>
        </div>
        <ProductGrid products={featured} loading={isFeaturedLoading} cols={4} />
      </section>
    </main>
  );
}
