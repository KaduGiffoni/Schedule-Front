import axios from "axios";
import { useAuthStore } from '../features/auth/store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://localhost:7284',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {

  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Sessão expirada. A fazer logout...");
      useAuthStore.getState().logout();
      // FIX: 9 — Redirecionamento forçado no interceptor 401
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);