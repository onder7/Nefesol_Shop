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

  const handleGoogleClick = async () => {
    if (!(window as any).google) {
      toast.error('Google Sign-In yüklenemiyor');
      return;
    }

    (window as any).google.accounts.id.renderButton(
      document.createElement('div'),
      {
        type: 'standard',
        size: 'large',
        text: 'signin_with',
        locale: 'tr',
      }
    );

    (window as any).google.accounts.id.prompt(async (notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        toast.info('Google Sign-In dialog açılıyor...');
      }
    });
  };

  const handleFacebookClick = () => {
    if (!(window as any).FB) {
      toast.error('Facebook SDK yüklenemiyor');
      return;
    }

    (window as any).FB.login(async (response: any) => {
      if (response.authResponse) {
        try {
          const res = await fetch('/api/auth/oauth/facebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: response.authResponse.accessToken })
          });
          const data = await res.json();
          if (data.success) {
            setUser(data.data.user as User, data.data.accessToken);
            toast.success('Facebook ile giriş başarılı!');
            navigate(from, { replace: true });
          } else {
            toast.error(data.error || 'Giriş başarısız');
          }
        } catch (err) {
          toast.error('Giriş işlemi başarısız');
        }
      }
    }, { scope: 'public_profile,email' });
  };

  const handleInstagramClick = () => {
    toast.info('Instagram ile giriş - Facebook üzerinden yapılır');
  };

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

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-input" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Veya</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="h-12 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors text-xl font-bold hover:scale-105 active:scale-95"
                  title="Google ile giriş yap"
                >
                  G
                </button>
                <button
                  type="button"
                  onClick={handleFacebookClick}
                  className="h-12 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors text-xl font-bold hover:scale-105 active:scale-95"
                  title="Facebook ile giriş yap"
                >
                  f
                </button>
                <button
                  type="button"
                  onClick={handleInstagramClick}
                  className="h-12 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors text-xl hover:scale-105 active:scale-95"
                  title="Instagram ile giriş yap"
                >
                  📷
                </button>
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

      {/* Sağ Sütun: Arka Plan - Gri gradyan */}
      <div className="hidden lg:block h-full w-full bg-gradient-to-br from-slate-100 to-slate-200" />
    </main>
  );
}
