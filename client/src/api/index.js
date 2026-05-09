import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ==================== API Functions ====================
// These will be populated in subsequent phases

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Properties
export const propertiesAPI = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  getGoodPrice: (params) => api.get('/properties/good-price', { params }),
  getStats: () => api.get('/properties/stats'),
};

// Bookmarks
export const bookmarksAPI = {
  getAll: (params) => api.get('/bookmarks', { params }),
  add: (propertyId) => api.post('/bookmarks', { propertyId }),
  remove: (propertyId) => api.delete(`/bookmarks/${propertyId}`),
  updateNote: (propertyId, note) => api.put(`/bookmarks/${propertyId}/note`, { note }),
};

// Crawl (Admin)
export const crawlAPI = {
  learn: (data) => api.post('/crawl/learn', data),
  test: (data) => api.post('/crawl/test', data),
  getConfigs: () => api.get('/crawl/configs'),
  createConfig: (data) => api.post('/crawl/configs', data),
  updateConfig: (id, data) => api.patch(`/crawl/configs/${id}`, data),
  deleteConfig: (id) => api.delete(`/crawl/configs/${id}`),
  trigger: (id) => api.post(`/crawl/trigger/${id}`),
  triggerAll: () => api.post('/crawl/trigger-all'),
};

// Users (Admin)
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};
