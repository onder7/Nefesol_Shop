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

export function Register() {
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
            <h1 className="text-2xl font-bold mb-8">Kayıt Ol</h1>
            
            <form onSubmit={handleSubmit} className="space-y-4 w-full">
              {/* Ad & Soyad - Yan Yana */}
              <div className="grid grid-cols-2 gap-4">
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
                  Giriş Yapın
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 px-10 text-sm font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {loading ? 'Kayıt Yapılıyor...' : 'KAYIT OL'}
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
              Yardım
            </Link>
          </footer>
        </div>
      </div>

      {/* Arka Plan Resmi */}
      <div 
        className="hidden lg:block h-full w-full bg-cover bg-center"
        style={{ backgroundImage: `url('/auth-register-bg.png')` }}
      />
    </main>
  );
}
