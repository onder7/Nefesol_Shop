import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/authApi';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { useStoreInfo } from '@/hooks/useStoreInfo';

export function Register() {
  const { name: storeName } = useStoreInfo();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [viewPassword, setViewPassword] = useState(false);
  const [viewConfirmPassword, setViewConfirmPassword] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

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
        text: 'signup_with',
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
            toast.success('Facebook ile kayıt başarılı!');
            navigate('/', { replace: true });
          } else {
            toast.error(data.error || 'Kayıt başarısız');
          }
        } catch (err) {
          toast.error('Kayıt işlemi başarısız');
        }
      }
    }, { scope: 'public_profile,email' });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = form;
      const res = await authApi.register(payload);
      const { accessToken } = res.data.data;
      const meRes = await authApi.me();
      setUser(meRes.data.data as User, accessToken);
      toast.success('Kayıt başarılı! Hoş geldiniz.');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Kayıt yapılamadı';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-background">
      {/* Sol Sütun: Form Alanı */}
      <div className="flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md flex flex-col justify-between min-h-[85vh]">
          {/* Logo */}
          <div className="mb-8 sm:mb-12">
            <Link to="/" className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              {storeName}
            </Link>
          </div>

          {/* Form İçeriği */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Kayıt Ol</h1>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 w-full">
              {/* Ad & Soyad - Mobilde alt alta, desktop'te yan yana */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-bold text-sm text-foreground">
                    Ad
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Ad"
                    className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                    value={form.firstName}
                    onChange={set('firstName')}
                    required
                    minLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="font-bold text-sm text-foreground">
                    Soyad
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Soyad"
                    className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                    value={form.lastName}
                    onChange={set('lastName')}
                    required
                    minLength={2}
                  />
                </div>
              </div>

              {/* E-posta */}
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
                  onChange={set('email')}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Şifre */}
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
                    onChange={set('password')}
                    required
                    minLength={8}
                    autoComplete="new-password"
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

              {/* Şifre Tekrar */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-bold text-sm text-foreground">
                  Şifre Tekrar
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={viewConfirmPassword ? 'text' : 'password'}
                    placeholder="Şifre Tekrar"
                    className="h-12 pl-4 pr-12 rounded-md border border-input focus:border-primary w-full"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setViewConfirmPassword(!viewConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={viewConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {viewConfirmPassword ? (
                      <EyeOff className="h-5 w-5 stroke-[1.5]" />
                    ) : (
                      <Eye className="h-5 w-5 stroke-[1.5]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Link to="/giris" className="font-bold text-primary hover:underline text-sm">
                  Zaten hesabınız var mı? Giriş yapın
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 px-10 text-sm font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {loading ? 'Kayıt Yapılıyor...' : 'KAYIT OL'}
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
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="h-12 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors text-xl font-bold hover:scale-105 active:scale-95"
                  title="Google ile kayıt ol"
                >
                  G
                </button>
                <button
                  type="button"
                  onClick={handleFacebookClick}
                  className="h-12 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors text-xl font-bold hover:scale-105 active:scale-95"
                  title="Facebook ile kayıt ol"
                >
                  f
                </button>
              </div>
            </form>
          </div>

          {/* Footer Linkleri */}
          <footer className="mt-8 sm:mt-16 flex flex-wrap gap-2 sm:gap-4 justify-between text-xs font-bold text-muted-foreground">
            <Link to="#" className="hover:text-foreground transition-colors">
              Kullanım Koşulları
            </Link>
            <Link to="#" className="hover:text-foreground transition-colors">
              Gizlilik Politikası
            </Link>
            <Link to="#" className="hover:text-foreground transition-colors">
              Yardım
            </Link>
          </footer>
        </div>
      </div>

      {/* Arka Plan - Gri gradyan */}
      <div className="hidden lg:block h-full w-full bg-gradient-to-br from-slate-100 to-slate-200" />
    </main>
  );
}
