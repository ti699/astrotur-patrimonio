import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Converte o caminho salvo (/uploads/...) na URL completa servida pelo backend
export const fileUrl = (path?: string | null) => {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  const base = String(api.defaults.baseURL ?? "").replace(/\/api\/?$/, "");
  return `${base}${path}`;
};

// Envia o Token JWT salvo no login em todas as requisições HTTP
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});