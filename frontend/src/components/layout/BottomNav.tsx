import { Link, useLocation } from 'react-router-dom';
import { UserCircle, Heart, ShoppingBag, Menu, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { authApi } from '@/services/authApi';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function BottomNav() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { name: storeName } = useStoreInfo();
  const itemCount = useCartStore((s) => s.itemCount);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
  });
  const categories = (categoriesData?.data?.data ?? []).filter((cat: any) => cat.showInMenu !== false);

  const { data: menuPagesData } = useQuery({
    queryKey: ['menu-pages'],
    queryFn: () => api.get<{ success: boolean; data: Array<{ slug: string; title: string; isSystem: boolean; showInHeader: boolean }> }>('/pages'),
    staleTime: 5 * 60 * 1000,
  });
  const menuPages = (menuPagesData?.data?.data ?? []).filter((p) => p.showInHeader);

  const { data: navLinksData } = useQuery({
    queryKey: ['nav-links'],
    queryFn: () => api.get<{ success: boolean; data: Array<{ id: string; label: string; url: string; openInNewTab: boolean }> }>('/nav-links'),
    staleTime: 5 * 60 * 1000,
  });
  const navLinks = navLinksData?.data?.data ?? [];

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 px-2 py-2 z-[60]">
      <div className="flex items-center justify-around h-16">
        {/* Hesabım */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors cursor-pointer p-2 flex-1 bg-transparent border-none outline-none">
              <UserCircle className="h-6 w-6 stroke-[1.5]" />
              <span className="text-[9px] font-medium">Hesabım</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-48 mb-2">
              {/* User Info */}
              <div className="px-3 py-2">
                <p className="text-xs font-medium truncate text-black">
                  {user?.profile?.firstName ?? user?.email}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />

              {/* Account Links */}
              <DropdownMenuItem render={<Link to="/hesabim" />} className="text-xs">
                Hesap Özeti
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/hesabim/siparisler" />} className="text-xs">
                Siparişlerim
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/hesabim/profil" />} className="text-xs">
                Profil Bilgilerim
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/hesabim/favoriler" />} className="text-xs">
                Favori Ürünlerim
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem onClick={handleLogout} className="text-destructive text-xs">
                <LogOut className="h-3 w-3 mr-2" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/giris"
            className="flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors p-2 flex-1"
          >
            <UserCircle className="h-6 w-6 stroke-[1.5]" />
            <span className="text-[9px] font-medium">Hesabım</span>
          </Link>
        )}

        {/* Favorilerim */}
        <Link
          to="/hesabim/favoriler"
          className={`flex flex-col items-center gap-1 transition-colors p-2 flex-1 ${
            isActive('/hesabim/favoriler') ? 'text-primary' : 'text-neutral-700 hover:text-primary'
          }`}
        >
          <Heart className="h-6 w-6 stroke-[1.5]" />
          <span className="text-[9px] font-medium">Favorilerim</span>
        </Link>

        {/* Sepetim */}
        <Link
          to="/sepet"
          className={`flex flex-col items-center gap-1 transition-colors p-2 flex-1 relative ${
            isActive('/sepet') ? 'text-primary' : 'text-neutral-700 hover:text-primary'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
            {itemCount > 0 && (
              <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[9px] font-medium">Sepetim</span>
        </Link>

        {/* Menü */}
        <Sheet>
          <SheetTrigger className="flex flex-col items-center gap-1 text-neutral-700 hover:text-primary transition-colors p-2 flex-1 bg-transparent border-none outline-none cursor-pointer z-50 relative">
            <Menu className="h-6 w-6" />
            <span className="text-[9px] font-medium">Menü</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[300px] md:w-[350px] p-0 z-[50] flex flex-col">
            {/* Kaydırılabilir içerik alanı */}
            <div className="flex-1 min-h-0 overflow-y-auto py-4 px-4 space-y-1">
              <SheetClose render={<Link to="/" className="text-lg font-bold text-primary px-2 py-2 block mb-2" />}>
                {storeName}
              </SheetClose>

              {/* Kategoriler */}
              <div className="pb-2">
                <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">Kategoriler</p>
                {categories.map((cat) => (
                  <SheetClose
                    key={cat.id}
                    render={
                      <Link
                        to={`/kategori/${cat.slug}`}
                        className="block px-2 py-2 text-sm font-medium rounded-md hover:bg-muted hover:text-primary transition-colors"
                      />
                    }
                  >
                    {cat.name}
                  </SheetClose>
                ))}
              </div>

              {/* Özel Linkler — admin'den yönetilen navigasyon linkleri */}
              {navLinks.length > 0 && (
                <div className="border-t pt-3 pb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">Bağlantılar</p>
                  {navLinks.map((link) => (
                    <SheetClose
                      key={link.id}
                      render={
                        <a
                          href={link.url}
                          target={link.openInNewTab ? '_blank' : undefined}
                          rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                          className="block px-2 py-2 text-sm font-medium rounded-md hover:bg-muted hover:text-primary transition-colors"
                        />
                      }
                    >
                      {link.label}
                    </SheetClose>
                  ))}
                </div>
              )}

              {/* Sayfalar — admin'den gelen, showInHeader aktif olanlar */}
              {menuPages.length > 0 && (
                <div className="border-t pt-3 pb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">Sayfalar</p>
                  {menuPages.map((p) => (
                    <SheetClose
                      key={p.slug}
                      render={
                        <Link
                          to={p.isSystem ? `/${p.slug}` : `/sayfa/${p.slug}`}
                          className="block px-2 py-2 text-sm font-medium rounded-md hover:bg-muted hover:text-primary transition-colors"
                        />
                      }
                    >
                      {p.title}
                    </SheetClose>
                  ))}
                </div>
              )}

              {/* Hesabım */}
              <div className="border-t pt-3 pb-2">
                <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">Hesabım</p>
                <ThemeToggle showLabel className="px-2 py-2 text-sm font-medium rounded-md hover:bg-muted justify-start w-full" />
                <SheetClose
                  render={
                    <Link
                      to="/ara"
                      className="block px-2 py-2 text-sm font-medium rounded-md hover:bg-muted hover:text-primary transition-colors"
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
                          to="/hesabim"
                          className="block px-2 py-2 text-sm font-medium rounded-md hover:bg-muted hover:text-primary transition-colors"
                        />
                      }
                    >
                      Hesap Özeti
                    </SheetClose>
                    <SheetClose
                      render={
                        <Link
                          to="/hesabim/siparisler"
                          className="block px-2 py-2 text-sm font-medium rounded-md hover:bg-muted hover:text-primary transition-colors"
                        />
                      }
                    >
                      Siparişlerim
                    </SheetClose>
                    <SheetClose
                      render={
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-2 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium rounded-md"
                        >
                          <LogOut className="h-4 w-4 mr-2 inline" />
                          Çıkış Yap
                        </button>
                      }
                    />
                  </>
                ) : (
                  <SheetClose
                    render={
                      <Link
                        to="/giris"
                        className="block px-2 py-2 text-sm font-medium rounded-md hover:bg-muted hover:text-primary transition-colors"
                      />
                    }
                  >
                    Giriş Yap
                  </SheetClose>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
