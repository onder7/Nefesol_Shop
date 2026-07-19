import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircle, Heart, ShoppingBag, Search, LogOut, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { authApi } from '@/services/authApi';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import { api } from '@/services/api';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useTaxConfig } from '@/hooks/useTaxConfig';
import type { Product } from '@/types';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { name: storeName } = useStoreInfo();
  const { hasWarning: profileHasWarning, message: profileWarningMessage } = useProfileCompleteness();
  const { taxRate } = useTaxConfig();
  const itemCount = useCartStore((s) => s.itemCount);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { fetchWishlist } = useWishlistStore();

  const [predictions, setPredictions] = useState<Product[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Fetch logo from settings
  useEffect(() => {
    fetch('/api/store-logo')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data?.logo_url) {
          setLogoUrl(data.data.logo_url);
        }
      })
      .catch(() => {
        // Silent fail - use fallback text
      });
  }, []);

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
  const categories = (categoriesData?.data?.data ?? []).filter((cat: any) => cat.showInMenu !== false);

  // Özel navigasyon linkleri — admin panelinden yönetilen kategori menüsü ekleri
  const { data: navLinksData } = useQuery({
    queryKey: ['nav-links'],
    queryFn: () => api.get<{ success: boolean; data: Array<{ id: string; label: string; url: string; openInNewTab: boolean }> }>('/nav-links'),
    staleTime: 5 * 60 * 1000,
  });
  const navLinks = navLinksData?.data?.data ?? [];

  // Üst şerit menüsü — admin tarafından yönetilen Müşteri Hizmetleri sayfaları
  const { data: menuPagesData } = useQuery({
    queryKey: ['menu-pages'],
    queryFn: () => api.get<{ success: boolean; data: Array<{ slug: string; title: string; isSystem: boolean; showInHeader: boolean; showInFooter: boolean }> }>('/pages'),
    staleTime: 5 * 60 * 1000,
  });
  const menuPages = (menuPagesData?.data?.data ?? []).filter((p) => p.showInHeader);

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
    <header className="border-b bg-white dark:bg-neutral-950 dark:border-neutral-800 sticky top-0 z-40">
      {/* ─── Üst Şerit: Müşteri Hizmetleri sayfaları (masaüstü) ─────────── */}
      {menuPages.length > 0 && (
        <div className="hidden lg:block border-b border-neutral-100 bg-neutral-50/70 dark:bg-neutral-900 dark:border-neutral-800">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-end gap-x-5 gap-y-1 py-1.5 flex-wrap">
              {menuPages.map((p) => (
                <Link
                  key={p.slug}
                  to={p.isSystem ? `/${p.slug}` : `/sayfa/${p.slug}`}
                  className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-primary transition-colors whitespace-nowrap"
                >
                  {p.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Üst Bar: Logo + Arama + İkonlar ─────────────────────────── */}
      <div className="container mx-auto px-2 sm:px-4 h-20 flex items-center gap-3 sm:gap-6">
        <Link to="/" className="flex items-center h-full flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 sm:h-12 object-contain max-w-[120px] sm:max-w-[150px]" />
          ) : (
            <span className="text-lg sm:text-xl font-bold text-primary">{storeName}</span>
          )}
        </Link>

        {/* Ana Arama Çubuğu (ortada, büyük) */}
        <form onSubmit={handleSearchSubmit} className="search-container relative flex-1 max-w-2xl mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Ürün, kategori veya marka ara"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowPredictions(true)}
            className="h-11 pl-11 pr-4 bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 dark:text-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-200 focus-visible:border-neutral-400 text-sm rounded-lg placeholder-neutral-400 shadow-sm"
          />

          {showPredictions && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg sm:rounded-xl border border-neutral-100 shadow-xl overflow-hidden z-[100] max-h-60 sm:max-h-80 overflow-y-auto">
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
                    const rawPrice = prod.variants?.[0]?.price ? Number(prod.variants[0].price) : 0;
                    const grossPrice = prod.vatIncluded ? rawPrice : rawPrice * (1 + taxRate / 100);
                    const price = rawPrice ? grossPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '';
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
                          <div className="hidden sm:block text-[11px] font-bold text-neutral-900 shrink-0">
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

        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
          <ThemeToggle className="text-neutral-700 hover:text-primary dark:text-neutral-300" />
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <div className="flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors cursor-pointer outline-none bg-transparent border-none">
                    <div className="relative">
                      <UserCircle className="h-6 w-6 stroke-[1.5]" />
                      {profileHasWarning && (
                        <span
                          title={profileWarningMessage}
                          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
                        />
                      )}
                    </div>
                    <span className="hidden md:block text-[10px] sm:text-[11px] font-medium">Hesabım</span>
                  </div>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                {/* User Info */}
                <div className="px-3 py-2">
                  <p className="text-sm font-medium truncate text-black dark:text-white">
                    {user?.profile?.firstName ?? user?.email}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />

                {/* Eksik profil uyarısı (adres/telefon) */}
                {!user?.isGuest && profileHasWarning && (
                  <>
                    <DropdownMenuItem
                      render={<Link to="/hesabim/profil" />}
                      className="text-sm items-start gap-2 bg-red-50 text-red-700 focus:bg-red-100 dark:bg-red-900/20 dark:text-red-300"
                    >
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="leading-snug">{profileWarningMessage} Tamamlamak için tıklayın.</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Account Links */}
                {!user?.isGuest && (
                  <>
                    <DropdownMenuItem render={<Link to="/hesabim" />} className="text-sm">
                      Hesap Özeti
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link to="/hesabim/siparisler" />} className="text-sm">
                      Siparişlerim
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link to="/hesabim/sorularim" />} className="text-sm">
                      Soru &amp; Cevaplarım
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link to="/hesabim/degerlendirmelerim" />} className="text-sm">
                      Değerlendirmelerim
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link to="/hesabim/favoriler" />} className="text-sm">
                      Beğendiklerim
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link to="/hesabim/indirimlerim" />} className="text-sm">
                      İndirimlerim
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link to="/hesabim/profil" />} className="text-sm">
                      Profil Bilgileri
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Logout */}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive text-sm">
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
              <span className="hidden md:block text-[10px] sm:text-[11px] font-medium">Hesabım</span>
            </Link>
          )}

          <Link
            to="/hesabim/favoriler"
            className="hidden sm:flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors"
          >
            <Heart className="h-6 w-6 stroke-[1.5]" />
            <span className="hidden md:block text-[11px] font-medium">Favorilerim</span>
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
            <span className="hidden md:block text-[11px] font-medium">Sepetim</span>
          </Link>
        </div>
        {/* Mobil hamburger menü kaldırıldı — mobilde alt menü (BottomNav) zaten aynı menüyü sunuyor */}
      </div>

      {/* ─── Renkli Gradient Şerit ───────────────────────────────────── */}
      <div
        className="h-1 w-full"
        style={{
          background:
            'linear-gradient(90deg, rgb(0, 0, 0) 0%, rgba(251, 146, 60, 0.12) 12%, rgb(49, 51, 52) 28%, rgb(58, 66, 67) 42%, rgb(79, 74, 68) 58%, rgb(31, 30, 35) 72%, rgb(147, 139, 143) 88%, rgb(17, 16, 16) 100%)',
        }}
      />

      {/* ─── Kategori Navigasyon Barı ────────────────────────────────── */}
      <nav className="hidden lg:block bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-0.5 py-2.5 flex-wrap">
            {/* Tüm Ürünler */}
            <div className="flex items-center">
              <Link
                to="/ara"
                className="inline-flex items-center justify-center gap-1 text-center px-2 py-1.5 rounded-md text-[13px] leading-tight font-semibold text-neutral-700 dark:text-neutral-200 hover:text-primary dark:hover:bg-neutral-800 hover:bg-orange-50 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
              >
                Tüm Ürünler
              </Link>
              <span className="text-neutral-200 select-none" aria-hidden="true">|</span>
            </div>
            {categories.slice(0, 9).map((cat, idx) => {
              const children = (cat.children ?? []).filter((c: any) => c.showInMenu !== false);
              const hasChildren = children.length > 0;
              return (
                <div key={cat.id} className="flex items-center">
                  <div className="group relative">
                    <Link
                      to={`/kategori/${cat.slug}`}
                      className="inline-flex items-center justify-center gap-1 text-center px-2 py-1.5 rounded-md text-[13px] leading-tight font-semibold text-neutral-700 dark:text-neutral-200 group-hover:text-primary dark:group-hover:bg-neutral-800 group-hover:bg-orange-50 group-hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <span className="whitespace-pre-line">{cat.name}</span>
                      {hasChildren && (
                        <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover:rotate-180" />
                      )}
                    </Link>

                    {/* Alt Kategori Dropdown */}
                    {hasChildren && (
                      <div className="invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50">
                        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-100 dark:border-neutral-700 py-2 min-w-[200px]">
                          {children.map((child: any) => {
                            const grandChildren = (child.children ?? []).filter((g: any) => g.showInMenu !== false);
                            return (
                              <div key={child.id}>
                                <Link
                                  to={`/kategori/${child.slug}`}
                                  className={`block px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-orange-50 dark:hover:bg-neutral-800 hover:text-primary transition-colors whitespace-nowrap ${grandChildren.length > 0 ? 'font-semibold' : ''}`}
                                >
                                  {child.name}
                                </Link>
                                {grandChildren.map((grand: any) => (
                                  <Link
                                    key={grand.id}
                                    to={`/kategori/${grand.slug}`}
                                    className="block pl-8 pr-4 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:bg-orange-50 dark:hover:bg-neutral-800 hover:text-primary transition-colors whitespace-nowrap"
                                  >
                                    ↳ {grand.name}
                                  </Link>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {idx < categories.slice(0, 9).length - 1 && (
                    <span className="text-neutral-200 select-none" aria-hidden="true">|</span>
                  )}
                </div>
              );
            })}
            {/* Özel navigasyon linkleri */}
            {navLinks.map((link, idx) => (
              <div key={link.id} className="flex items-center">
                {(categories.slice(0, 9).length > 0 || idx > 0) && (
                  <span className="text-neutral-200 select-none" aria-hidden="true">|</span>
                )}
                <a
                  href={link.url}
                  target={link.openInNewTab ? '_blank' : undefined}
                  rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center justify-center px-2 py-1.5 rounded-md text-[13px] leading-tight font-semibold text-neutral-700 dark:text-neutral-200 hover:text-primary dark:hover:bg-neutral-800 hover:bg-orange-50 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
                >
                  {link.label}
                </a>
              </div>
            ))}
            {categories.length > 9 && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 px-2 text-[13px] font-semibold text-neutral-700 hover:text-primary transition-colors cursor-pointer outline-none whitespace-nowrap">
                  Diğer <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {categories.slice(9).map((cat) => (
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
          </div>
        </div>
      </nav>
    </header>
  );
}
