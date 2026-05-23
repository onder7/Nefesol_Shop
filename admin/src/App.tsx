import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
import Dashboard from './pages/Dashboard/ECommerce';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import DefaultLayout from './layout/DefaultLayout';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAdminAuth();
  if (!user) return <Navigate to="/auth/signin" replace />;
  return <>{children}</>;
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
                  path="orders"
                  element={
                    <>
                      <PageTitle title="Siparişler | MaBridge Admin" />
                      <Orders />
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
              </Routes>
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
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
    <AdminAuthProvider>
      <TestModeBanner />
      <AppRoutes />
    </AdminAuthProvider>
  );
}
