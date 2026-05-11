import axios from "axios";
import { useAuthStore } from '../features/auth/store/authStore';

export const api = axios.create({
  baseURL: 'https://localhost:7284',
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
    }
    return Promise.reject(error);
  }
);