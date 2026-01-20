import React, { useState, useEffect } from 'react';
import { bitbucketAPI, projectsAPI } from '../services/api';
import '../styles/BitbucketConnect.css';

function BitbucketConnect({ onRepoAnalyzed }) {
    const [status, setStatus] = useState({ connected: false, loading: true });
    const [repos, setRepos] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [analyzing, setAnalyzing] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        checkStatus();
        loadProjects();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await bitbucketAPI.getStatus();
            setStatus({ ...res.data, loading: false });
            if (res.data.connected) {
                loadRepos();
            }
        } catch (err) {
            setStatus({ connected: false, loading: false });
        }
    };

    const loadProjects = async () => {
        try {
            const res = await projectsAPI.getAll();
            setProjects(res.data.data || res.data || []);
        } catch (err) {
            console.error('Error loading projects:', err);
        }
    };

    const loadRepos = async () => {
        try {
            setLoadingRepos(true);
            const res = await bitbucketAPI.getRepos();
            setRepos(res.data.repos || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al cargar repositorios');
        } finally {
            setLoadingRepos(false);
        }
    };

    const handleConnect = () => {
        window.location.href = bitbucketAPI.getOAuthUrl();
    };

    const handleDisconnect = async () => {
        if (!window.confirm('¿Desconectar tu cuenta de Bitbucket?')) return;
        try {
            await bitbucketAPI.disconnect();
            setStatus({ connected: false, loading: false });
            setRepos([]);
        } catch (err) {
            setError('Error al desconectar');
        }
    };

    const handleAnalyze = async (repo) => {
        if (!selectedProject) {
            setError('Selecciona un proyecto primero');
            return;
        }

        try {
            setAnalyzing(repo.fullName);
            setError('');
            const res = await bitbucketAPI.analyzeRepo(
                repo.workspace,
                repo.name,
                selectedProject,
                repo.defaultBranch
            );
            if (onRepoAnalyzed) {
                onRepoAnalyzed(res.data);
            }
            setAnalyzing(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al analizar');
            setAnalyzing(null);
        }
    };

    if (status.loading) {
        return <div className="bitbucket-connect loading">Cargando...</div>;
    }

    return (
        <div className="bitbucket-connect">
            <div className="connect-header">
                <div className="service-info">
                    <span className="service-icon">🪣</span>
                    <div>
                        <h3>Bitbucket</h3>
                        {status.connected && (
                            <span className="connected-as">@{status.username}</span>
                        )}
                    </div>
                </div>
                {status.connected ? (
                    <button className="btn btn-small btn-secondary" onClick={handleDisconnect}>
                        Desconectar
                    </button>
                ) : (
                    <button className="btn btn-small btn-primary" onClick={handleConnect}>
                        Conectar Bitbucket
                    </button>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {status.connected && (
                <div className="repos-section">
                    <div className="project-selector">
                        <label>Proyecto destino:</label>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                        >
                            <option value="">Selecciona un proyecto...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                            ))}
                        </select>
                    </div>

                    {loadingRepos ? (
                        <div className="loading-repos">Cargando repositorios...</div>
                    ) : repos.length > 0 ? (
                        <div className="repos-list">
                            {repos.map(repo => (
                                <div key={repo.id} className="repo-item">
                                    <div className="repo-info">
                                        <span className="repo-name">{repo.fullName}</span>
                                        <span className="repo-meta">
                                            {repo.private ? '🔒 Privado' : '🌍 Público'}
                                            {repo.language && ` • ${repo.language}`}
                                        </span>
                                    </div>
                                    <button
                                        className="btn btn-small"
                                        onClick={() => handleAnalyze(repo)}
                                        disabled={analyzing === repo.fullName || !selectedProject}
                                    >
                                        {analyzing === repo.fullName ? '⏳...' : '🔍 Analizar'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-repos">No se encontraron repositorios</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default BitbucketConnect;
