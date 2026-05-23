import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Home } from '@/pages/Home';
import { NotFound } from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Aşama 3 — Auth */}
            {/* <Route path="/giris" element={<Login />} /> */}
            {/* <Route path="/kayit" element={<Register />} /> */}

            {/* Aşama 4 — Katalog */}
            {/* <Route path="/kategori/:slug" element={<CategoryPage />} /> */}
            {/* <Route path="/urun/:slug" element={<ProductDetail />} /> */}
            {/* <Route path="/ara" element={<Search />} /> */}

            {/* Aşama 5 — Sepet */}
            {/* <Route path="/sepet" element={<Cart />} /> */}

            {/* Korumalı route'lar */}
            <Route element={<ProtectedRoute />}>
              {/* Aşama 6 — Checkout */}
              {/* <Route path="/odeme" element={<Checkout />} /> */}

              {/* Aşama 7 — Siparişler */}
              {/* <Route path="/hesabim/siparisler" element={<Orders />} /> */}
              {/* <Route path="/hesabim/profil" element={<Profile />} /> */}
              {/* <Route path="/hesabim/favoriler" element={<Wishlist />} /> */}
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </div>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
