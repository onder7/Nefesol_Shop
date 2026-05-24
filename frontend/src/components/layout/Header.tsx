import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircle, Heart, ShoppingBag, Search, Menu, LogOut, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { authApi } from '@/services/authApi';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import type { Product } from '@/types';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { fetchWishlist } = useWishlistStore();

  const [predictions, setPredictions] = useState<Product[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setPredictions([]);
      setLoadingPredictions(false);
      return;
    }

    setLoadingPredictions(true);
    const delayDebounceFn = setTimeout(() => {
      productApi.list({ search: searchQuery.trim(), limit: 5 })
        .then((res) => {
          setPredictions(res.data?.items || []);
        })
        .catch((err) => {
          console.error('Failed to load predictions:', err);
        })
        .finally(() => {
          setLoadingPredictions(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
  });
  const categories = categoriesData?.data?.data ?? [];

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // silently ignore
    }
    logout();
    toast.success('Çıkış yapıldı');
    navigate('/');
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/ara?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/ara');
    }
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        <Link to="/" className="text-xl font-bold text-primary">
          MaBridge
        </Link>
 
        <nav className="hidden lg:flex items-center gap-6 text-sm">
          {categories.slice(0, 6).map((cat) => (
            <Link
              key={cat.id}
              to={`/kategori/${cat.slug}`}
              className="hover:text-primary transition-colors font-medium whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
          {categories.length > 6 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer outline-none font-medium whitespace-nowrap">
                Diğer <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {categories.slice(6).map((cat) => (
                  <DropdownMenuItem
                    key={cat.id}
                    render={<Link to={`/kategori/${cat.slug}`} className="w-full cursor-pointer" />}
                  >
                    {cat.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <form onSubmit={handleSearchSubmit} className="search-container relative w-48 xl:w-64 ml-4">
            <Input
              type="text"
              placeholder="Ürün ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowPredictions(true)}
              className="h-9 pr-8 bg-neutral-50 border-neutral-200 focus-visible:ring-primary focus-visible:bg-white text-xs rounded-lg placeholder-neutral-400"
            />
            <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary transition-colors cursor-pointer">
              <Search className="h-4 w-4" />
            </button>

            {showPredictions && searchQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-neutral-100 shadow-xl overflow-hidden z-[100] max-h-80 overflow-y-auto">
                {loadingPredictions ? (
                  <div className="p-4 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>Aranıyor...</span>
                  </div>
                ) : predictions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-400">
                    Uyumlu ürün bulunamadı.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-50">
                    {predictions.map((prod) => {
                      const primaryImg = prod.images?.find(img => img.isPrimary)?.url || prod.images?.[0]?.url || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=100';
                      const price = prod.variants?.[0]?.price ? Number(prod.variants[0].price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '';
                      return (
                        <Link
                          key={prod.id}
                          to={`/urun/${prod.slug}`}
                          onClick={() => {
                            setSearchQuery('');
                            setShowPredictions(false);
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors"
                        >
                          <img
                            src={primaryImg}
                            alt={prod.name}
                            className="h-10 w-10 object-cover rounded bg-neutral-100 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-neutral-800 truncate">{prod.name}</p>
                            <p className="text-[9px] text-neutral-400 truncate">{prod.category?.name}</p>
                          </div>
                          {price && (
                            <div className="text-[11px] font-bold text-neutral-900 shrink-0">
                              {price}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                    <Link
                      to={`/ara?search=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setShowPredictions(false)}
                      className="block text-center text-[10px] font-semibold text-primary hover:underline p-2.5 bg-neutral-50/50"
                    >
                      Tüm sonuçları gör
                    </Link>
                  </div>
                )}
              </div>
            )}
          </form>
        </nav>

        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="lg:hidden" render={<Link to="/ara" />}>
            <Search className="h-5 w-5" />
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <div className="flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors cursor-pointer outline-none bg-transparent border-none">
                    <UserCircle className="h-6 w-6 stroke-[1.5]" />
                    <span className="text-[11px] font-medium">Hesabım</span>
                  </div>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium truncate">
                  {user?.profile?.firstName ?? user?.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/hesabim/profil" />}>
                  Profilim
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link to="/hesabim/siparisler" />}>
                  Siparişlerim
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/giris"
              className="flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors"
            >
              <UserCircle className="h-6 w-6 stroke-[1.5]" />
              <span className="text-[11px] font-medium">Hesabım</span>
            </Link>
          )}

          <Link
            to="/hesabim/favoriler"
            className="flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors"
          >
            <Heart className="h-6 w-6 stroke-[1.5]" />
            <span className="text-[11px] font-medium">Favorilerim</span>
          </Link>

          <Link
            to="/sepet"
            className="flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors"
          >
            <div className="relative">
              <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
              <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount}
              </span>
            </div>
            <span className="text-[11px] font-medium">Sepetim</span>
          </Link>

          <Sheet>
            <SheetTrigger
              nativeButton={true}
              className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors"
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <div className="flex flex-col gap-6 py-6 h-full">
              <SheetClose render={<Link to="/" className="text-xl font-bold text-primary px-2" />}>
                MaBridge
              </SheetClose>
              <div className="flex flex-col gap-4">
                <p className="font-semibold text-sm text-muted-foreground px-2">Kategoriler</p>
                <div className="flex flex-col gap-2">
                  {categories.map((cat) => (
                    <SheetClose
                      key={cat.id}
                      render={
                        <Link
                          to={`/kategori/${cat.slug}`}
                          className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                        />
                      }
                    >
                      {cat.name}
                    </SheetClose>
                  ))}
                </div>
              </div>
                <div className="border-t pt-4 mt-auto">
              <div className="flex flex-col gap-2">
                <SheetClose
                  render={
                    <Link
                      to="/ara"
                      className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                    />
                  }
                >
                  Tüm Ürünler
                </SheetClose>
                {isAuthenticated ? (
                  <>
                    <SheetClose
                      render={
                        <Link
                          to="/hesabim/profil"
                          className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                        />
                      }
                    >
                      Profilim
                    </SheetClose>
                    <SheetClose
                      render={
                        <Link
                          to="/hesabim/siparisler"
                          className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                        />
                      }
                    >
                      Siparişlerim
                    </SheetClose>
                    <SheetClose
                      render={
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="justify-start px-2 py-1.5 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                        />
                      }
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Çıkış Yap
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose
                    render={
                      <Button
                        render={<Link to="/giris" />}
                        className="w-full mt-2"
                      />
                    }
                  >
                    Giriş Yap
                  </SheetClose>
                )}
              </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
