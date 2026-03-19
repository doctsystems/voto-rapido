import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: apiBaseUrl,
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

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then(r => r.data),
  profile: () => api.get('/auth/profile').then(r => r.data),
};

export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data),
  create: (data: any) => api.post('/users', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/users/${id}`).then(r => r.data),
};

export const partiesApi = {
  getAll: () => api.get('/parties').then(r => r.data),
  getWithElectionTypes: () => api.get('/parties/with-election-types').then(r => r.data),
  create: (data: any) => api.post('/parties', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/parties/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/parties/${id}`).then(r => r.data),
  assignElectionType: (partyId: string, data: { electionTypeId: string; candidateName?: string }) =>
    api.post(`/parties/${partyId}/election-types`, data).then(r => r.data),
  removeElectionType: (partyId: string, electionTypeId: string) =>
    api.delete(`/parties/${partyId}/election-types/${electionTypeId}`).then(r => r.data),
};

export const schoolsApi = {
  getAll: (search?: string) => api.get('/schools', { params: search ? { search } : undefined }).then(r => r.data),
  getOne: (id: string) => api.get(`/schools/${id}`).then(r => r.data),
  create: (data: any) => api.post('/schools', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/schools/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/schools/${id}`).then(r => r.data),
};

export const tablesApi = {
  getAll: (schoolId?: string) => api.get('/tables', { params: schoolId ? { schoolId } : undefined }).then(r => r.data),
  create: (data: any) => api.post('/tables', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/tables/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/tables/${id}`).then(r => r.data),
};

export const electionTypesApi = {
  getAll: () => api.get('/election-types').then(r => r.data),
  create: (data: any) => api.post('/election-types', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/election-types/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/election-types/${id}`).then(r => r.data),
};

export const votesApi = {
  getMetrics: () => api.get('/votes/metrics').then(r => r.data),
  getReports: (schoolId?: string) => api.get('/votes/reports', { params: schoolId ? { schoolId } : undefined }).then(r => r.data),
  getReport: (id: string) => api.get(`/votes/reports/${id}`).then(r => r.data),
  createReport: (data: any) => api.post('/votes/reports', data).then(r => r.data),
  updateReport: (id: string, data: any) => api.put(`/votes/reports/${id}`, data).then(r => r.data),
  submitReport: (id: string) => api.patch(`/votes/reports/${id}/submit`).then(r => r.data),
  verifyReport: (id: string) => api.patch(`/votes/reports/${id}/verify`).then(r => r.data),
  deleteReport: (id: string) => api.delete(`/votes/reports/${id}`).then(r => r.data),
};

const getFilenameFromDisposition = (disposition?: string, fallback = 'reporte') => {
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  return match ? decodeURIComponent(match[1].replace(/"/g, '')) : fallback;
};

const downloadReportFile = async (path: string, fallbackName: string) => {
  const response = await api.get(path, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  const disposition = response.headers['content-disposition'];
  const filename = getFilenameFromDisposition(disposition, fallbackName);

  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const reportsApi = {
  exportExcel: () => downloadReportFile('/reports/export/excel', 'reporte-votacion.xlsx'),
  exportPdf: () => downloadReportFile('/reports/export/pdf', 'reporte-votacion.pdf'),
};
