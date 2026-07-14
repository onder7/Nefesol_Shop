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
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { ConsentCheckboxes, type ConsentValue } from '@/components/auth/ConsentCheckboxes';

export function Login() {
  const { name: storeName } = useStoreInfo();
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  const { sessionId, setCart, clearSession } = useCartStore();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [guestForm, setGuestForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [guestConsent, setGuestConsent] = useState<ConsentValue>({ emailConsent: true, smsConsent: true, acceptTerms: false });
  const [loading, setLoading] = useState(false);
  const [viewPassword, setViewPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'guest'>(from === '/odeme' ? 'guest' : 'login');

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestConsent.acceptTerms) {
      toast.error('Üyelik koşullarını ve kişisel verilerimin korunmasını kabul etmelisiniz.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.guestLogin({
        ...guestForm,
        marketingConsent: guestConsent.emailConsent,
        smsConsent: guestConsent.smsConsent,
        acceptTerms: guestConsent.acceptTerms,
      });
      const { accessToken, user } = res.data.data;
      setUser(user as User, accessToken);

      // Misafir sepetini aktar
      try {
        const mergeRes = await cartApi.merge(sessionId);
        setCart(mergeRes.data.data);
        clearSession();
      } catch {
        // merge başarısız olsa da devam et
      }

      toast.success('Misafir girişi başarılı, ödemeye yönlendiriliyorsunuz...');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
      const msg = data?.message ?? data?.error ?? 'İşlem gerçekleştirilemedi';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleCredential = async (idToken: string) => {
    try {
      const res = await fetch('/api/auth/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user as User, data.data.accessToken);
        try {
          const mergeRes = await cartApi.merge(sessionId);
          setCart(mergeRes.data.data);
          clearSession();
        } catch {
          // merge başarısız olsa da girişe devam et
        }
        toast.success('Google ile giriş başarılı!');
        navigate(from, { replace: true });
      } else {
        toast.error(data.error || 'Giriş başarısız');
      }
    } catch {
      toast.error('Google ile giriş başarısız');
    }
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
      const data = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
      const msg = data?.message ?? data?.error ?? 'Giriş yapılamadı';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-background">
      {/* Sol Sütun: Form Alanı */}
      <div className="flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md flex flex-col justify-between min-h-screen sm:min-h-[85vh]">
          {/* Logo */}
          <div className="mb-8 sm:mb-12">
            <Link to="/" className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              {storeName}
            </Link>
          </div>

          {/* Form İçeriği */}
          <div className="flex-1 flex flex-col justify-center">
            {from === '/odeme' ? (
              <div className="flex border-b border-border mb-6">
                <button
                  className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'login'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setActiveTab('login')}
                >
                  Üye Girişi
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'guest'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setActiveTab('guest')}
                >
                  Üye Olmadan Devam Et
                </button>
              </div>
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Giriş Yap</h1>
            )}

            {activeTab === 'login' ? (
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

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
                  <div className="flex gap-4 text-sm">
                    <Link to="/kayit" className="font-bold text-primary hover:underline">
                      Yeni hesap oluştur
                    </Link>
                    <Link to="/sifremi-unuttum" className="font-bold text-primary hover:underline">
                      Şifremi Unuttum
                    </Link>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-10 text-sm font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full sm:w-auto"
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
                <div className="space-y-3">
                  <GoogleSignInButton text="signin_with" onCredential={handleGoogleCredential} />
                </div>
              </form>
            ) : (
              <form onSubmit={handleGuestSubmit} className="space-y-6 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guest-firstName" className="font-bold text-sm text-foreground">
                      Ad
                    </Label>
                    <Input
                      id="guest-firstName"
                      placeholder="Adınız"
                      className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                      value={guestForm.firstName}
                      onChange={(e) => setGuestForm((f) => ({ ...f, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-lastName" className="font-bold text-sm text-foreground">
                      Soyad
                    </Label>
                    <Input
                      id="guest-lastName"
                      placeholder="Soyadınız"
                      className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                      value={guestForm.lastName}
                      onChange={(e) => setGuestForm((f) => ({ ...f, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-email" className="font-bold text-sm text-foreground">
                    E-posta
                  </Label>
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder="E-posta"
                    className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">Sipariş bilgilendirmeleri bu adrese yapılacaktır.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-phone" className="font-bold text-sm text-foreground">
                    Telefon (Opsiyonel)
                  </Label>
                  <Input
                    id="guest-phone"
                    type="tel"
                    placeholder="05XX XXX XX XX"
                    className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                {/* ETK/KVKK onayları */}
                <ConsentCheckboxes value={guestConsent} onChange={(p) => setGuestConsent((c) => ({ ...c, ...p }))} />

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-10 text-sm font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full"
                  >
                    {loading ? 'İşleniyor...' : 'ÖDEMEYE DEVAM ET'}
                  </Button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>

      {/* Sağ Sütun: Arka Plan - Gri gradyan */}
      <div className="hidden lg:block h-full w-full bg-gradient-to-br from-slate-100 to-slate-200" />
    </main>
  );
}
