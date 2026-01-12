import axios from 'axios';

// URL dinámica basada en el hostname actual (igual que AuthContext)
const API_URL = `http://${window.location.hostname}:5000`;

// Create axios instance with baseURL
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for cookies
    headers: {
        'Content-Type': 'application/json'
    }
});

// Projects API
export const projectsAPI = {
    getAll: (page = 1, limit = 100) => api.get(`/projects?page=${page}&limit=${limit}`),
    getByUser: (page = 1, limit = 100) => api.get(`/projects?user_only=true&page=${page}&limit=${limit}`),
    getById: (id) => api.get(`/projects/${id}`),
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
    delete: (id) => api.delete(`/api-specs/${id}`),
    parseSwagger: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/api-specs/parse-swagger', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    // Version management
    getVersions: (specId) => api.get(`/api-specs/${specId}/versions`),
    getVersion: (specId, versionId) => api.get(`/api-specs/${specId}/versions/${versionId}`),
    restoreVersion: (specId, versionId) => api.post(`/api-specs/${specId}/versions/${versionId}/restore`)
};

// Repos API
export const reposAPI = {
    analyze: (repoUrl, projectId, branch = 'main') =>
        api.post('/repos/analyze', { repo_url: repoUrl, project_id: projectId, branch }),
    getAll: (projectId = null) =>
        api.get(`/repos${projectId ? `?project_id=${projectId}` : ''}`),
    getById: (id) => api.get(`/repos/${id}`),
    generateSpec: (repoId, fileId, data) =>
        api.post(`/repos/${repoId}/files/${fileId}/generate-spec`, data),
    resync: (id) => api.post(`/repos/${id}/resync`),
    delete: (id) => api.delete(`/repos/${id}`)
};

// GitHub API
export const githubAPI = {
    getStatus: () => api.get('/github/auth/github/status'),
    disconnect: () => api.post('/github/auth/github/disconnect'),
    getRepos: (visibility = 'all', page = 1, perPage = 30) =>
        api.get(`/github/repos?visibility=${visibility}&page=${page}&per_page=${perPage}`),
    analyzeRepo: (owner, repo, projectId, branch = 'main') =>
        api.post(`/github/repos/${owner}/${repo}/analyze`, { project_id: projectId, branch }),
    // OAuth redirect URL (used by frontend to initiate flow)
    getOAuthUrl: () => `${API_URL}/github/auth/github`
};

export default api;
