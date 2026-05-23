import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { LiveChat } from '@/components/common/LiveChat';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { CategoryPage } from '@/pages/CategoryPage';
import { ProductDetail } from '@/pages/ProductDetail';
import { Search } from '@/pages/Search';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
import { OrderSuccess } from '@/pages/OrderSuccess';
import { Orders, OrderDetail } from '@/pages/Orders';
import { Profile } from '@/pages/Profile';
import { Favorites } from '@/pages/Favorites';
import { NotFound } from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/giris', '/kayit'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      {!isAuthPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Aşama 3 — Auth */}
        <Route path="/giris" element={<Login />} />
        <Route path="/kayit" element={<Register />} />

        {/* Aşama 4 — Katalog */}
        <Route path="/kategori/:slug" element={<CategoryPage />} />
        <Route path="/urun/:slug" element={<ProductDetail />} />
        <Route path="/ara" element={<Search />} />

        {/* Aşama 5 — Sepet */}
        <Route path="/sepet" element={<Cart />} />

        {/* Aşama 6 — Checkout */}
        <Route path="/siparis-tamamlandi" element={<OrderSuccess />} />

        {/* Korumalı route'lar */}
        <Route element={<ProtectedRoute />}>
          <Route path="/odeme" element={<Checkout />} />
          <Route path="/hesabim/siparisler" element={<Orders />} />
          <Route path="/hesabim/siparisler/:id" element={<OrderDetail />} />
          <Route path="/hesabim/profil" element={<Profile />} />
          <Route path="/hesabim/favoriler" element={<Favorites />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <LiveChat />}
    </div>
  );
}

function TestModeBanner() {
  return (
    <div className="fixed top-0 left-0 z-[9999] pointer-events-none overflow-hidden w-28 h-28">
      <div className="absolute bg-amber-500 text-white text-[10px] font-bold text-center py-1 left-[-28px] top-[18px] w-[120px] -rotate-45 shadow tracking-widest">
        TEST MODU
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TestModeBanner />
        <AppContent />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
