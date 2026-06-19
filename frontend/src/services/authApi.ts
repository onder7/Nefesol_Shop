import { api } from './api';
import type { User } from '@/types';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GuestLoginPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<{ success: boolean; data: { accessToken: string } }>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<{ success: boolean; data: { accessToken: string; user: User } }>('/auth/login', data),

  guestLogin: (data: GuestLoginPayload) =>
    api.post<{ success: boolean; data: { accessToken: string; user: User } }>('/auth/guest-login', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ success: boolean; data: User }>('/auth/me'),

  refreshToken: () =>
    api.post<{ success: boolean; data: { accessToken: string } }>('/auth/refresh-token'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),

  forgotPassword: (email: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/reset-password', { token, newPassword }),
};
