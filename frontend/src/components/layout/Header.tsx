import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export function Header() {
  const { isAuthenticated, user } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="text-xl font-bold text-primary">
          MaBridge
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/kategori/elektronik" className="hover:text-primary transition-colors">Elektronik</Link>
          <Link to="/kategori/giyim" className="hover:text-primary transition-colors">Giyim</Link>
          <Link to="/ara" className="hover:text-primary transition-colors">Tüm Ürünler</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/ara"><Search className="h-5 w-5" /></Link>
          </Button>

          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link to="/sepet">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
          </Button>

          {isAuthenticated ? (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/hesabim/profil"><User className="h-5 w-5" /></Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/giris">Giriş Yap</Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
