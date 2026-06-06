import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { LiveChat } from '@/components/common/LiveChat';
import { PopupNotification } from '@/components/common/PopupNotification';
import { CampaignDisplay } from '@/components/common/CampaignDisplay';
import { CookieConsent } from '@/components/common/CookieConsent';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { CategoryPage } from '@/pages/CategoryPage';
import { ProductDetail } from '@/pages/ProductDetail';
import CampaignDetail from '@/pages/CampaignDetail';
import { Search } from '@/pages/Search';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
import { OrderSuccess } from '@/pages/OrderSuccess';
import { Orders, OrderDetail } from '@/pages/Orders';
import { Profile } from '@/pages/Profile';
import { Favorites } from '@/pages/Favorites';
import { NotFound } from '@/pages/NotFound';
import { AccountDashboard } from '@/pages/AccountDashboard';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import Maintenance from '@/pages/Maintenance';
import { SupportPage } from '@/pages/SupportPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/giris', '/kayit'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <CampaignDisplay />
      {!isAuthPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Aşama 3 — Auth */}
        <Route path="/giris" element={<Login />} />
        <Route path="/kayit" element={<Register />} />

        {/* Aşama 4 — Katalog */}
        <Route path="/kategori/:slug" element={<CategoryPage />} />
        <Route path="/urun/:slug" element={<ProductDetail />} />
        <Route path="/kampanya/:id" element={<CampaignDetail />} />
        <Route path="/ara" element={<Search />} />

        {/* Aşama 5 — Sepet */}
        <Route path="/sepet" element={<Cart />} />

        {/* Aşama 6 — Checkout */}
        <Route path="/siparis-tamamlandi" element={<OrderSuccess />} />

        {/* Müşteri Hizmetleri Rotaları */}
        <Route path="/iletisim" element={<SupportPage />} />
        <Route path="/iade" element={<SupportPage />} />
        <Route path="/sss" element={<SupportPage />} />
        <Route path="/sozlesmeler" element={<SupportPage />} />

        {/* Korumalı route'lar */}
        <Route element={<ProtectedRoute />}>
          <Route path="/odeme" element={<Checkout />} />
          <Route path="/hesabim" element={<AccountDashboard />} />
          <Route path="/hesabim/siparisler" element={<Orders />} />
          <Route path="/hesabim/siparisler/:id" element={<OrderDetail />} />
          <Route path="/hesabim/profil" element={<Profile />} />
          <Route path="/hesabim/favoriler" element={<Favorites />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <LiveChat />}
      {!isAuthPage && <PopupNotification />}
      <CookieConsent />
    </div>
  );
}


export default function App() {
  const [maintenance, setMaintenance] = useState<{ isActive: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    api.get<{ success: boolean; data: { isActive: boolean; message: string } }>('/maintenance-status')
      .then((res) => {
        if (res.data?.success && res.data?.data?.isActive) {
          setMaintenance(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Maintenance status check failed:', err);
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Admin paneline giriş yapmış kişi de bypass eder
  const hasAdminPanelSession = !!localStorage.getItem('admin_token');

  const showMaintenance =
    maintenance?.isActive &&
    user?.role !== 'ADMIN' &&
    !hasAdminPanelSession &&
    window.location.pathname !== '/giris';

  if (showMaintenance) {
    return <Maintenance message={maintenance.message} />;
  }

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
