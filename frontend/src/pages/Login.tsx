import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/authApi';
import { cartApi } from '@/services/cartApi';
import { useCartStore } from '@/store/cartStore';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  const { sessionId, setCart, clearSession } = useCartStore();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [viewPassword, setViewPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(form);
      const { accessToken, user } = res.data.data;
      setUser(user as User, accessToken);

      // Misafir sepetini kullanıcı hesabına aktar
      try {
        const mergeRes = await cartApi.merge(sessionId);
        setCart(mergeRes.data.data);
        clearSession();
      } catch {
        // merge başarısız olsa da girişe devam et
      }

      toast.success('Giriş başarılı!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Giriş yapılamadı';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-background">
      {/* Sol Sütun: Form Alanı */}
      <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-[440px] flex flex-col justify-between min-h-[85vh]">
          {/* Logo */}
          <div className="mb-12">
            <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
              MaBridge
            </Link>
          </div>

          {/* Form İçeriği */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-2xl font-bold mb-8">Giriş Yap</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold text-sm text-foreground">
                  E-posta
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="E-posta"
                  className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-bold text-sm text-foreground">
                  Şifre
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={viewPassword ? 'text' : 'password'}
                    placeholder="Şifre"
                    className="h-12 pl-4 pr-12 rounded-md border border-input focus:border-primary w-full"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setViewPassword(!viewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={viewPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {viewPassword ? (
                      <EyeOff className="h-5 w-5 stroke-[1.5]" />
                    ) : (
                      <Eye className="h-5 w-5 stroke-[1.5]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Link to="/kayit" className="font-bold text-primary hover:underline text-sm">
                  Yeni hesap oluştur
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 px-10 text-sm font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {loading ? 'Giriş Yapılıyor...' : 'GİRİŞ YAP'}
                </Button>
              </div>
            </form>
          </div>

          {/* Footer Linkleri */}
          <footer className="mt-16 flex flex-wrap gap-4 justify-between text-xs font-bold text-muted-foreground">
            <Link to="#" className="hover:text-foreground transition-colors">
              Kullanım Koşulları
            </Link>
            <Link to="#" className="hover:text-foreground transition-colors">
              Gizlilik Politikası
            </Link>
            <Link to="#" className="hover:text-foreground transition-colors">
              Şifremi Unuttum
            </Link>
          </footer>
        </div>
      </div>

      {/* Sağ Sütun: Arka Plan Resmi */}
      <div 
        className="hidden lg:block h-full w-full bg-cover bg-center"
        style={{ backgroundImage: `url('/auth-login-bg.svg')` }}
      />
    </main>
  );
}
