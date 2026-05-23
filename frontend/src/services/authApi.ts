import { api } from './api';
import type { User } from '@/types';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<{ success: boolean; data: { accessToken: string } }>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<{ success: boolean; data: { accessToken: string; user: User } }>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ success: boolean; data: User }>('/auth/me'),

  refreshToken: () =>
    api.post<{ success: boolean; data: { accessToken: string } }>('/auth/refresh-token'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
};
