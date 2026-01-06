import axios from 'axios';

const API_URL = `http://${window.location.hostname}:5000`;

// Create axios instance with credentials
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

// Projects API
export const projectsAPI = {
    getAll: (page = 1, limit = 100) => api.get(`/projects?page=${page}&limit=${limit}`),
    getByUser: (page = 1, limit = 100) => api.get(`/projects?user_only=true&page=${page}&limit=${limit}`),
    create: (projectData) => api.post('/projects', projectData),
    update: (id, projectData) => api.put(`/projects/${id}`, projectData),
    delete: (id) => api.delete(`/projects/${id}`)
};

// Documents API
export const documentsAPI = {
    getAll: (page = 1, limit = 100) => api.get(`/documents?page=${page}&limit=${limit}`),
    getByUser: (page = 1, limit = 100) => api.get(`/documents?user_only=true&page=${page}&limit=${limit}`),
    getByProject: (projectId, page = 1, limit = 100) => api.get(`/documents?project_id=${projectId}&page=${page}&limit=${limit}`),
    getById: (id) => api.get(`/documents/${id}`),
    create: (documentData) => api.post('/documents', documentData),
    update: (id, documentData) => api.put(`/documents/${id}`, documentData),
    delete: (id) => api.delete(`/documents/${id}`)
};

// API Specs API
export const apiSpecsAPI = {
    getAll: () => api.get('/api-specs'),
    getByProject: (projectId) => api.get(`/api-specs?project_id=${projectId}`),
    getById: (id) => api.get(`/api-specs/${id}`),
    create: (specData) => api.post('/api-specs', specData),
    update: (id, specData) => api.put(`/api-specs/${id}`, specData),
    delete: (id) => api.delete(`/api-specs/${id}`)
};

export default api;
