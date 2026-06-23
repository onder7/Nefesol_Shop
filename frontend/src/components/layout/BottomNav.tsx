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
          <SheetContent side="right" className="w-[85vw] sm:w-[300px] md:w-[350px] p-0 z-[50]">
            <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 py-4 sm:py-6 px-4 sm:px-6 h-full overflow-y-auto">
              <SheetClose render={<Link to="/" className="text-xl font-bold text-primary px-2" />}>
                {storeName}
              </SheetClose>

              {/* Kategoriler */}
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

              {/* Hesabım / Hesap Özeti */}
              <div className="border-t pt-4 mt-auto">
                <div className="flex flex-col gap-2">
                  <ThemeToggle showLabel className="px-2 py-1.5 text-sm font-medium rounded-md hover:bg-muted justify-start w-full" />
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
                            to="/hesabim"
                            className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                          />
                        }
                      >
                        Hesap Özeti
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
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-2 py-1.5 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors font-medium rounded-md"
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
                          className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted w-full text-center"
                        />
                      }
                    >
                      Giriş Yap
                    </SheetClose>
                  )}
                </div>
              </div>

              {/* Müşteri Hizmetleri */}
              <div className="border-t pt-4">
                <div className="flex flex-col gap-2">
                  <SheetClose
                    render={
                      <Link
                        to="/iletisim"
                        className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                      />
                    }
                  >
                    İletişim & Destek
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        to="/iade"
                        className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                      />
                    }
                  >
                    Kolay İade & Değişim
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        to="/sss"
                        className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                      />
                    }
                  >
                    Sıkça Sorulan Sorular
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        to="/sozlesmeler"
                        className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                      />
                    }
                  >
                    Şartlar & Politikalar
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        to="/hakkimizda"
                        className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                      />
                    }
                  >
                    Hakkımızda
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        to="/kvkk"
                        className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                      />
                    }
                  >
                    KVKK Sözleşmesi
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        to="/uyelik"
                        className="px-2 py-1.5 text-sm hover:text-primary transition-colors font-medium rounded-md hover:bg-muted"
                      />
                    }
                  >
                    Üyelik Sözleşmesi
                  </SheetClose>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
