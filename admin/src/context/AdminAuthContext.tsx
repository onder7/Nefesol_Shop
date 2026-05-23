import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, setRefreshToken, clearToken } from '../lib/api';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  profile?: { firstName?: string; lastName?: string };
}

interface AuthCtx {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AuthCtx | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const raw = localStorage.getItem('admin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: { accessToken: string; refreshToken: string; user: AdminUser } }>(
        '/auth/login',
        { email, password }
      );
      if (res.data.user.role !== 'ADMIN') {
        throw new Error('Bu panele erişim için admin yetkisi gereklidir');
      }
      setToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      localStorage.setItem('admin_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AdminAuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
