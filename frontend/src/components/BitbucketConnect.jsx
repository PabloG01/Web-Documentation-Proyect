import React, { useState, useEffect } from 'react';
import { bitbucketAPI, projectsAPI } from '../services/api';
import '../styles/BitbucketConnect.css';

const API_URL = `http://${window.location.hostname}:5000`;

function BitbucketConnect({ onRepoAnalyzed }) {
    const [status, setStatus] = useState({ connected: false, loading: true });
    const [repos, setRepos] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [analyzing, setAnalyzing] = useState(null);
    const [error, setError] = useState('');

    // Manual connection states
    const [connectionMode, setConnectionMode] = useState('oauth'); // 'oauth' or 'manual'
    const [manualUsername, setManualUsername] = useState('');
    const [manualAppPassword, setManualAppPassword] = useState('');
    const [connectingManual, setConnectingManual] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

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

    const connectManual = async (e) => {
        e.preventDefault();
        setError('');
        setConnectingManual(true);

        try {
            const response = await fetch(`${API_URL}/bitbucket/auth/bitbucket/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: manualUsername, appPassword: manualAppPassword })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || data.message || 'Error al conectar');
            }

            const data = await response.json();

            setStatus({
                loading: false,
                connected: true,
                username: data.user.username
            });

            setManualUsername('');
            setManualAppPassword('');
            setConnectionMode('oauth');
            loadRepos();

        } catch (err) {
            console.error('Manual connection error:', err);
            setError(err.message || 'Error al conectar con App Password');
        } finally {
            setConnectingManual(false);
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
                    <div className="connection-controls">
                        <div className="connection-mode-toggle">
                            <button
                                className={`mode-btn ${connectionMode === 'oauth' ? 'active' : ''}`}
                                onClick={() => setConnectionMode('oauth')}
                            >
                                OAuth
                            </button>
                            <button
                                className={`mode-btn ${connectionMode === 'manual' ? 'active' : ''}`}
                                onClick={() => setConnectionMode('manual')}
                            >
                                App Password
                            </button>
                        </div>

                        {connectionMode === 'oauth' ? (
                            <button className="btn btn-small btn-primary" onClick={handleConnect}>
                                Conectar con OAuth
                            </button>
                        ) : (
                            <form onSubmit={connectManual} className="manual-connect-form">
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={manualUsername}
                                    onChange={(e) => setManualUsername(e.target.value)}
                                    className="username-input"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="App Password"
                                    value={manualAppPassword}
                                    onChange={(e) => setManualAppPassword(e.target.value)}
                                    className="password-input"
                                    required
                                    minLength={10}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={connectingManual}
                                >
                                    {connectingManual ? 'Conectando...' : 'Conectar'}
                                </button>
                            </form>
                        )}
                    </div>
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

            {!status.connected && connectionMode === 'manual' && (
                <div className="bitbucket-info">
                    <div
                        className="info-header"
                        onClick={() => setShowInstructions(!showInstructions)}
                        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <h4 style={{ margin: 0 }}>🔑 Usa un App Password</h4>
                        <span style={{ fontSize: '1.2rem' }}>{showInstructions ? '▼' : '▶'}</span>
                    </div>
                    {showInstructions && (
                        <>
                            <p>Para conectar con credenciales específicas:</p>
                            <ol>
                                <li>Ve a Bitbucket Settings → Personal Bitbucket settings → App passwords</li>
                                <li>Click en <strong>"Create app password"</strong></li>
                                <li>Dale permisos de <strong>Repositories (read)</strong></li>
                                <li>Copia el password generado e ingrésalo arriba junto con tu username</li>
                            </ol>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default BitbucketConnect;
