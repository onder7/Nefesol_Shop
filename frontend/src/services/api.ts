import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const PRODUCT_IMAGES = [
  '/product-1.png',
  '/product-2.png',
  '/product-3.png',
  '/product-4.png',
  '/product-5.png',
  '/product-6.png',
];

function transformProduct(product: any) {
  if (product && typeof product === 'object') {
    if (product.id && product.name && Array.isArray(product.images)) {
      const hash = String(product.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      product.images = product.images.map((img: any, idx: number) => {
        const imgIndex = Math.abs(hash + idx) % PRODUCT_IMAGES.length;
        return {
          ...img,
          url: PRODUCT_IMAGES[imgIndex],
        };
      });
    }
  }
}

function traverseAndTransform(obj: any) {
  if (!obj || typeof obj !== 'object') return;
  transformProduct(obj);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === 'object') {
        traverseAndTransform(obj[key]);
      }
    }
  }
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.data) {
      traverseAndTransform(res.data);
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
        const { accessToken } = res.data.data;
        useAuthStore.getState().setTokens(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);
