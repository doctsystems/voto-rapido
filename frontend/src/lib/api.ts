import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then(r => r.data),
  profile: () => api.get('/auth/profile').then(r => r.data),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data),
  getOne: (id: string) => api.get(`/users/${id}`).then(r => r.data),
  create: (data: any) => api.post('/users', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/users/${id}`).then(r => r.data),
};

// Parties
export const partiesApi = {
  getAll: () => api.get('/parties').then(r => r.data),
  create: (data: any) => api.post('/parties', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/parties/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/parties/${id}`).then(r => r.data),
};

// Schools
export const schoolsApi = {
  getAll: () => api.get('/schools').then(r => r.data),
  getOne: (id: string) => api.get(`/schools/${id}`).then(r => r.data),
  create: (data: any) => api.post('/schools', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/schools/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/schools/${id}`).then(r => r.data),
};

// Tables
export const tablesApi = {
  getAll: () => api.get('/tables').then(r => r.data),
  create: (data: any) => api.post('/tables', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/tables/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/tables/${id}`).then(r => r.data),
};

// Election types
export const electionTypesApi = {
  getAll: () => api.get('/election-types').then(r => r.data),
  create: (data: any) => api.post('/election-types', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/election-types/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/election-types/${id}`).then(r => r.data),
};

// Votes
export const votesApi = {
  getMetrics: () => api.get('/votes/metrics').then(r => r.data),
  getReports: () => api.get('/votes/reports').then(r => r.data),
  getReport: (id: string) => api.get(`/votes/reports/${id}`).then(r => r.data),
  createReport: (data: any) => api.post('/votes/reports', data).then(r => r.data),
  submitReport: (id: string) => api.patch(`/votes/reports/${id}/submit`).then(r => r.data),
  verifyReport: (id: string) => api.patch(`/votes/reports/${id}/verify`).then(r => r.data),
};

// Reports export
export const reportsApi = {
  exportExcel: () => window.open('/api/v1/reports/export/excel', '_blank'),
  exportPdf: () => window.open('/api/v1/reports/export/pdf', '_blank'),
};
