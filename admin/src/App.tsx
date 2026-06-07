import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
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
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <Loader />;

  return (
    <Routes>
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
                      <PageTitle title="Dashboard | MaBridge Admin" />
                      <Dashboard />
                    </>
                  }
                />
                <Route
                  path="products"
                  element={
                    <>
                      <PageTitle title="Ürünler | MaBridge Admin" />
                      <Products />
                    </>
                  }
                />
                <Route
                  path="products/new"
                  element={
                    <>
                      <PageTitle title="Yeni Ürün | MaBridge Admin" />
                      <ProductDetailPage />
                    </>
                  }
                />
                <Route
                  path="products/:id"
                  element={
                    <>
                      <PageTitle title="Ürün Düzenle | MaBridge Admin" />
                      <ProductDetailPage />
                    </>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <>
                      <PageTitle title="Siparişler | MaBridge Admin" />
                      <Orders />
                    </>
                  }
                />
                <Route
                  path="orders/:id"
                  element={
                    <>
                      <PageTitle title="Sipariş Detayı | MaBridge Admin" />
                      <OrderDetailPage />
                    </>
                  }
                />
                <Route
                  path="customers"
                  element={
                    <>
                      <PageTitle title="Mü��teriler | MaBridge Admin" />
                      <Customers />
                    </>
                  }
                />
                <Route
                  path="categories"
                  element={
                    <>
                      <PageTitle title="Kategoriler | MaBridge Admin" />
                      <Categories />
                    </>
                  }
                />
                <Route
                  path="brands"
                  element={
                    <>
                      <PageTitle title="Markalar | MaBridge Admin" />
                      <Brands />
                    </>
                  }
                />
                <Route
                  path="discounts"
                  element={
                    <>
                      <PageTitle title="İndirimler | MaBridge Admin" />
                      <DiscountsPage />
                    </>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <>
                      <PageTitle title="Raporlar | MaBridge Admin" />
                      <Analytics />
                    </>
                  }
                />
                <Route
                  path="user-analytics"
                  element={
                    <>
                      <PageTitle title="Kullanıcı İstatistikleri | MaBridge Admin" />
                      <UserAnalytics />
                    </>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <>
                      <PageTitle title="Sistem Ayarları | MaBridge Admin" />
                      <Settings />
                    </>
                  }
                />
                <Route
                  path="settings/shipping"
                  element={
                    <>
                      <PageTitle title="Kargo Ayarları | MaBridge Admin" />
                      <ShippingSettings />
                    </>
                  }
                />
                <Route
                  path="attributes"
                  element={
                    <>
                      <PageTitle title="Ürün Özellikleri | MaBridge Admin" />
                      <AttributesPage />
                    </>
                  }
                />
                <Route
                  path="campaigns"
                  element={
                    <>
                      <PageTitle title="Kampanyalar | MaBridge Admin" />
                      <CampaignsPage />
                    </>
                  }
                />
                <Route
                  path="cancellations"
                  element={
                    <>
                      <PageTitle title="İptal & İade | MaBridge Admin" />
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
