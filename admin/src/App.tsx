import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
import Setup from './pages/Setup';
import { api } from './lib/api';
import Dashboard from './pages/Dashboard/ECommerce';
import Products from './pages/Products';
import Orders from './pages/Orders';
import OrderDetailPage from './pages/Orders/OrderDetailPage';
import ProductDetailPage from './pages/Products/ProductDetailPage';
import Customers from './pages/Customers';
import Categories from './pages/Categories';
import Brands from './pages/Brands';
import ShippingSettings from './pages/Settings/ShippingSettings';
import Analytics from './pages/Analytics';
import UserAnalytics from './pages/UserAnalytics';
import Settings from './pages/Settings';
import AttributesPage from './pages/Attributes';
import CampaignsPage from './pages/Campaigns';
import DiscountsPage from './pages/Discounts';
import { Cancellations } from './pages/Cancellations';
import DefaultLayout from './layout/DefaultLayout';
import { AdminAuthProvider } from './context/AdminAuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/auth/signin" replace />;
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  // null = henüz bilinmiyor, true/false = kurulum durumu
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    api
      .get<{ success: boolean; data: { setupCompleted: boolean } }>('/setup/status')
      .then((r) => setSetupCompleted(r.data?.setupCompleted ?? true))
      .catch(() => setSetupCompleted(true)) // hata olursa sihirbazı zorlama
      .finally(() => setLoading(false));
  }, []);

  if (loading || setupCompleted === null) return <Loader />;

  // Kurulum tamamlanmamışsa tüm trafiği sihirbaza yönlendir
  if (!setupCompleted && pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }
  // Kurulum tamamsa sihirbaz tekrar açılamaz
  if (setupCompleted && pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/auth/signin" element={<SignIn />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <Routes>
                <Route
                  index
                  element={
                    <>
                      <PageTitle title="Dashboard | Yönetim Paneli" />
                      <Dashboard />
                    </>
                  }
                />
                <Route
                  path="products"
                  element={
                    <>
                      <PageTitle title="Ürünler | Yönetim Paneli" />
                      <Products />
                    </>
                  }
                />
                <Route
                  path="products/new"
                  element={
                    <>
                      <PageTitle title="Yeni Ürün | Yönetim Paneli" />
                      <ProductDetailPage />
                    </>
                  }
                />
                <Route
                  path="products/:id"
                  element={
                    <>
                      <PageTitle title="Ürün Düzenle | Yönetim Paneli" />
                      <ProductDetailPage />
                    </>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <>
                      <PageTitle title="Siparişler | Yönetim Paneli" />
                      <Orders />
                    </>
                  }
                />
                <Route
                  path="orders/:id"
                  element={
                    <>
                      <PageTitle title="Sipariş Detayı | Yönetim Paneli" />
                      <OrderDetailPage />
                    </>
                  }
                />
                <Route
                  path="customers"
                  element={
                    <>
                      <PageTitle title="Mü��teriler | Yönetim Paneli" />
                      <Customers />
                    </>
                  }
                />
                <Route
                  path="categories"
                  element={
                    <>
                      <PageTitle title="Kategoriler | Yönetim Paneli" />
                      <Categories />
                    </>
                  }
                />
                <Route
                  path="brands"
                  element={
                    <>
                      <PageTitle title="Markalar | Yönetim Paneli" />
                      <Brands />
                    </>
                  }
                />
                <Route
                  path="discounts"
                  element={
                    <>
                      <PageTitle title="İndirimler | Yönetim Paneli" />
                      <DiscountsPage />
                    </>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <>
                      <PageTitle title="Raporlar | Yönetim Paneli" />
                      <Analytics />
                    </>
                  }
                />
                <Route
                  path="user-analytics"
                  element={
                    <>
                      <PageTitle title="Kullanıcı İstatistikleri | Yönetim Paneli" />
                      <UserAnalytics />
                    </>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <>
                      <PageTitle title="Sistem Ayarları | Yönetim Paneli" />
                      <Settings />
                    </>
                  }
                />
                <Route
                  path="settings/shipping"
                  element={
                    <>
                      <PageTitle title="Kargo Ayarları | Yönetim Paneli" />
                      <ShippingSettings />
                    </>
                  }
                />
                <Route
                  path="attributes"
                  element={
                    <>
                      <PageTitle title="Ürün Özellikleri | Yönetim Paneli" />
                      <AttributesPage />
                    </>
                  }
                />
                <Route
                  path="campaigns"
                  element={
                    <>
                      <PageTitle title="Kampanyalar | Yönetim Paneli" />
                      <CampaignsPage />
                    </>
                  }
                />
                <Route
                  path="cancellations"
                  element={
                    <>
                      <PageTitle title="İptal & İade | Yönetim Paneli" />
                      <Cancellations />
                    </>
                  }
                />
              </Routes>
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
