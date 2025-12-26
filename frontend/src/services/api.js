import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Create axios instance with credentials
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

// Projects API
export const projectsAPI = {
    getAll: () => api.get('/projects'),
    getByUser: () => api.get('/projects?user_only=true'),
    create: (projectData) => api.post('/projects', projectData),
    update: (id, projectData) => api.put(`/projects/${id}`, projectData),
    delete: (id) => api.delete(`/projects/${id}`)
};

// Documents API
export const documentsAPI = {
    getAll: () => api.get('/documents'),
    getByProject: (projectId) => api.get(`/documents?project_id=${projectId}`),
    getById: (id) => api.get(`/documents/${id}`),
    create: (documentData) => api.post('/documents', documentData),
    update: (id, documentData) => api.put(`/documents/${id}`, documentData),
    delete: (id) => api.delete(`/documents/${id}`)
};

export default api;
