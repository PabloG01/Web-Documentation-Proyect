import axios from 'axios';

// URL dinámica basada en el hostname actual
// Esto asegura que frontend y backend usen el MISMO hostname
// Ejemplo: si accedes vía http://172.16.3.254:3000, el backend será http://172.16.3.254:5000
// Esto permite usar sameSite: 'lax' (más seguro) en lugar de 'none'
const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;
const API_URL = `http://${window.location.hostname}:${PORT}`;

// Create axios instance with baseURL
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for cookies
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor: Auto-inject API Key if present in localStorage
// REMOVED: API Key usage is now isolated to HomePage via 'homepage_api_key'
// api.interceptors.request.use(...);

// Interceptor para manejar errores 401 y disparar evento de sesión cerrada
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const errorMessage = error.response?.data?.error || '';
            console.log('API 401 error:', errorMessage);

            // Dispatch custom event for session invalidation
            const event = new CustomEvent('session-invalidated', {
                detail: { message: errorMessage }
            });
            window.dispatchEvent(event);
        }
        return Promise.reject(error);
    }
);

// Projects API
export const projectsAPI = {
    getAll: (page = 1, limit = 100, environmentId = null) =>
        api.get(`/projects?page=${page}&limit=${limit}${environmentId ? `&environment_id=${environmentId}` : ''}`),
    getByUser: (page = 1, limit = 100) => api.get(`/projects?user_only=true&page=${page}&limit=${limit}`),
    getById: (id) => api.get(`/projects/${id}`),
    create: (projectData) => api.post('/projects', projectData),
    update: (id, projectData) => api.put(`/projects/${id}`, projectData),
    delete: (id) => api.delete(`/projects/${id}`)
};

// Environments API
export const environmentsAPI = {
    getAll: () => api.get('/environments'),
    create: (data) => api.post('/environments', data),
    update: (id, data) => api.put(`/environments/${id}`, data),
    delete: (id) => api.delete(`/environments/${id}`)
};

// Documents API
export const documentsAPI = {
    getAll: (page = 1, limit = 100) => api.get(`/documents?page=${page}&limit=${limit}`),
    getByUser: (page = 1, limit = 100) => api.get(`/documents?user_only=true&page=${page}&limit=${limit}`),
    getByProject: (projectId, page = 1, limit = 100) => api.get(`/documents?project_id=${projectId}&page=${page}&limit=${limit}`),
    getById: (id) => api.get(`/documents/${id}`),
    create: (documentData) => api.post('/documents', documentData),
    update: (id, documentData) => api.put(`/documents/${id}`, documentData),
    delete: (id) => api.delete(`/documents/${id}`),
    getVersions: (docId) => api.get(`/documents/${docId}/versions`),
    restoreVersion: (docId, versionId) => api.post(`/documents/${docId}/versions/${versionId}/restore`)
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
    analyze: (repoUrl, projectId, branch = 'main', authToken = null, authUsername = null) =>
        api.post('/repos/analyze', { repo_url: repoUrl, project_id: projectId, branch, auth_token: authToken, username: authUsername }),
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
    getOAuthUrl: () => `${API_URL}/github/auth/github`,
    // Per-user OAuth setup
    getSetup: () => api.get('/github/auth/github/setup'),
    saveSetup: (clientId, clientSecret, callbackUrl) =>
        api.post('/github/auth/github/setup', { client_id: clientId, client_secret: clientSecret, callback_url: callbackUrl }),
    deleteSetup: () => api.delete('/github/auth/github/setup')
};

// Bitbucket API
export const bitbucketAPI = {
    getStatus: () => api.get('/bitbucket/auth/bitbucket/status'),
    disconnect: () => api.post('/bitbucket/auth/bitbucket/disconnect'),
    getRepos: (role = 'member', page = 1, pagelen = 25) =>
        api.get(`/bitbucket/repos?role=${role}&page=${page}&pagelen=${pagelen}`),
    analyzeRepo: (workspace, repo, projectId, branch = 'main') =>
        api.post(`/bitbucket/repos/${workspace}/${repo}/analyze`, { project_id: projectId, branch }),
    getOAuthUrl: () => `${API_URL}/bitbucket/auth/bitbucket`,
    // Per-user OAuth setup
    getSetup: () => api.get('/bitbucket/auth/bitbucket/setup'),
    saveSetup: (clientId, clientSecret, callbackUrl) =>
        api.post('/bitbucket/auth/bitbucket/setup', { client_id: clientId, client_secret: clientSecret, callback_url: callbackUrl })
};

// API Keys Management
export const apiKeysAPI = {
    getAll: () => api.get('/api-keys'),
    create: (name, expiresInDays, projectId = null) => api.post('/api-keys', { name, expiresInDays, projectId }),
    revoke: (id) => api.delete(`/api-keys/${id}`),
    deletePermanently: (id) => api.delete(`/api-keys/${id}/permanent`),
    getUsageStats: (id) => api.get(`/api-keys/${id}/usage`)
};
// Stats
export const statsAPI = {
    getStats: () => api.get('/stats')
};

export default api;

