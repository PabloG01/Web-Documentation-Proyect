import React, { useState, useEffect } from 'react';
import { githubAPI } from '../services/api';
import '../styles/GitHubConnect.css';
import '../styles/AccordionStyles.css';

// Use dynamic hostname to ensure same-site behavior (frontend and backend must use same hostname)
const API_URL = `http://${window.location.hostname}:5000`;

/**
 * GitHub Connection Component
 * Allows users to connect their GitHub account and select repositories
 */
function GitHubConnect({ projectId, projects = [], onRepoSelect }) {
    const [status, setStatus] = useState({ loading: true, connected: false, username: null });
    const [repos, setRepos] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [analyzing, setAnalyzing] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Manual connection states
    const [connectionMode, setConnectionMode] = useState('oauth'); // 'oauth' or 'manual'
    const [manualToken, setManualToken] = useState('');
    const [connectingManual, setConnectingManual] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    // Accordion state
    const [isExpanded, setIsExpanded] = useState(false);

    // Modal state for project selection
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [selectedRepoForAnalysis, setSelectedRepoForAnalysis] = useState(null);
    const [targetProjectId, setTargetProjectId] = useState(projectId || (projects[0]?.id) || '');

    // Check connection status on mount
    useEffect(() => {
        checkStatus();

        // Check URL params for GitHub callback result
        const params = new URLSearchParams(window.location.search);
        if (params.get('github_connected') === 'true') {
            checkStatus();
            setSuccessMessage('¡Cuenta de GitHub conectada exitosamente! 🎉');
            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(''), 5000);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (params.get('github_error')) {
            setError(`Error de GitHub: ${params.get('github_error')}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // Load repos when connected
    useEffect(() => {
        if (status.connected) {
            loadRepos();
        }
    }, [status.connected]);

    const checkStatus = async () => {
        try {
            const response = await fetch(`${API_URL}/github/auth/github/status`, {
                credentials: 'include'
            });
            const data = await response.json();
            setStatus({ loading: false, ...data });
        } catch (err) {
            console.error('Error checking GitHub status:', err);
            setStatus({ loading: false, connected: false });
        }
    };

    const connectGitHub = async () => {
        setError('');

        try {
            // First check if OAuth is configured
            const statusResponse = await fetch(`${API_URL}/github/auth/github/oauth-status`, {
                credentials: 'include'
            });
            const statusData = await statusResponse.json();

            if (!statusData.configured) {
                setError('⚠️ OAuth no configurado. Por favor, configura tus credenciales OAuth primero haciendo click en "⚙️ Configurar OAuth Apps".');
                return;
            }

            // Call backend to get OAuth URL (this sends httpOnly cookie automatically)
            const response = await fetch(`${API_URL}/github/auth/github`, {
                credentials: 'include' // This sends the httpOnly auth_token cookie
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al obtener URL de OAuth');
            }

            const data = await response.json();

            // Redirect to GitHub OAuth
            window.location.href = data.oauthUrl;

        } catch (err) {
            console.error('Error connecting to GitHub:', err);
            setError(err.message || 'Error al conectar con GitHub');
        }
    };

    const disconnectGitHub = async () => {
        if (!window.confirm('¿Desconectar cuenta de GitHub?')) return;

        try {
            await fetch(`${API_URL}/github/auth/github/disconnect`, {
                method: 'POST',
                credentials: 'include'
            });
            setStatus({ loading: false, connected: false });
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
            const response = await fetch(`${API_URL}/github/auth/github/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token: manualToken })
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

            setSuccessMessage(`✅ Conectado como @${data.user.username}`);
            setTimeout(() => setSuccessMessage(''), 5000);

            setManualToken('');
            setConnectionMode('oauth'); // Reset to OAuth view
            loadRepos();

        } catch (err) {
            console.error('Manual connection error:', err);
            setError(err.message || 'Error al conectar con token');
        } finally {
            setConnectingManual(false);
        }
    };

    const loadRepos = async () => {
        setLoadingRepos(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/github/repos?visibility=${filter}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al cargar repos');
            }

            const data = await response.json();
            setRepos(data.repos);
        } catch (err) {
            setError(err.message);
            if (err.message.includes('Token') || err.message.includes('401')) {
                setStatus({ loading: false, connected: false });
            }
        } finally {
            setLoadingRepos(false);
        }
    };

    const initiateAnalysis = (repo) => {
        setSelectedRepoForAnalysis(repo);
        // If projectId is already provided via props and valid, use it as default
        if (projectId) {
            setTargetProjectId(projectId);
        } else if (projects.length > 0) {
            setTargetProjectId(projects[0].id);
        }
        setShowProjectModal(true);
    };

    const confirmAnalysis = async () => {
        if (!targetProjectId) {
            setError('Selecciona un proyecto primero');
            return;
        }

        const repo = selectedRepoForAnalysis;
        setShowProjectModal(false);
        setAnalyzing(repo.id);
        setError('');

        try {
            console.log('Analyzing repo:', repo, 'for project:', targetProjectId);
            const response = await fetch(
                `${API_URL}/github/repos/${repo.owner.login}/${repo.name}/analyze`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        project_id: targetProjectId,
                        branch: repo.defaultBranch
                    })
                }
            );

            // ... rest of logic same as before ...

            console.log('Response status:', response.status);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al analizar');
            }

            const data = await response.json();

            // Validate response structure
            if (!data || !data.analysis) {
                throw new Error('Respuesta inválida del servidor');
            }

            if (onRepoSelect) {
                onRepoSelect(data);
            }

            const filesCount = data.analysis.files?.length || 0;
            alert(`✅ Repositorio analizado: ${filesCount} archivos detectados`);

        } catch (err) {
            console.error('Error analyzing repo:', err);
            setError(err.message || 'Error desconocido al analizar');
        } finally {
            setAnalyzing(null);
            setSelectedRepoForAnalysis(null);
        }
    };

    // Filter repos
    const filteredRepos = repos.filter(repo => {
        if (search && !repo.name.toLowerCase().includes(search.toLowerCase())) {
            return false;
        }
        return true;
    });

    if (status.loading) {
        return <div className="github-connect loading">Cargando...</div>;
    }

    return (
        <div className="github-connect-accordion">
            {/* Accordion Header */}
            <div
                className="accordion-header"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: 'pointer' }}
            >
                <div className="accordion-header-content">
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    <span className="github-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                    </span>
                    <span className="accordion-title">GitHub</span>
                    {status.connected && (
                        <>
                            <span className="connection-status">✓ @{status.username}</span>
                            {repos.length > 0 && (
                                <span className="repo-count">{repos.length} {repos.length === 1 ? 'repo' : 'repos'}</span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Accordion Content */}
            <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                <div className="github-connect">
                    {/* Header */}
                    <div className="github-header">
                        <div className="github-title">
                            <span className="github-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24">
                                    <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                            </span>
                            <h3>GitHub</h3>
                        </div>

                        {status.connected ? (
                            <div className="github-user">
                                <span className="username">@{status.username}</span>
                                <button className="btn btn-small btn-secondary" onClick={disconnectGitHub}>
                                    Desconectar
                                </button>
                            </div>
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
                                        Token Manual
                                    </button>
                                </div>

                                {connectionMode === 'oauth' ? (
                                    <button className="btn btn-github" onClick={connectGitHub}>
                                        <svg viewBox="0 0 24 24" width="18" height="18">
                                            <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                        </svg>
                                        Conectar con OAuth
                                    </button>
                                ) : (
                                    <form onSubmit={connectManual} className="manual-connect-form">
                                        <input
                                            type="password"
                                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                            value={manualToken}
                                            onChange={(e) => setManualToken(e.target.value)}
                                            className="token-input"
                                            required
                                            minLength={20}
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

                    {successMessage && (
                        <div className="github-success">
                            ✅ {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="github-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Repos List */}
                    {status.connected && (
                        <div className="github-repos">
                            <div className="repos-filters">
                                <input
                                    type="text"
                                    placeholder="Buscar repositorio..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="search-input"
                                />
                                <select
                                    value={filter}
                                    onChange={(e) => { setFilter(e.target.value); loadRepos(); }}
                                    className="filter-select"
                                >
                                    <option value="all">Todos</option>
                                    <option value="public">Públicos</option>
                                    <option value="private">Privados</option>
                                </select>
                                <button className="btn btn-small" onClick={loadRepos} disabled={loadingRepos}>
                                    🔄
                                </button>
                            </div>

                            {loadingRepos ? (
                                <div className="repos-loading">Cargando repositorios...</div>
                            ) : filteredRepos.length === 0 ? (
                                <div className="repos-empty">
                                    {search ? 'No se encontraron repositorios' : 'No tienes repositorios'}
                                </div>
                            ) : (
                                <div className="repos-list">
                                    {filteredRepos.map(repo => (
                                        <div key={repo.id} className="repo-item">
                                            <div className="repo-info">
                                                <div className="repo-name">
                                                    {repo.private && <span className="private-badge">🔒</span>}
                                                    {repo.name}
                                                </div>
                                                <div className="repo-meta">
                                                    {repo.language && (
                                                        <span className="repo-language">{repo.language}</span>
                                                    )}
                                                    <span className="repo-branch">{repo.defaultBranch}</span>
                                                    {repo.description && (
                                                        <span className="repo-desc">{repo.description}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-small btn-primary"
                                                onClick={() => initiateAnalysis(repo)}
                                                disabled={analyzing === repo.id}
                                            >
                                                {analyzing === repo.id ? 'Analizando...' : 'Analizar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!status.connected && connectionMode === 'manual' && (
                        <div className="github-info">
                            <div
                                className="info-header"
                                onClick={() => setShowInstructions(!showInstructions)}
                                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <h4 style={{ margin: 0 }}>🔑 Usa un Personal Access Token</h4>
                                <span style={{ fontSize: '1.2rem' }}>{showInstructions ? '▼' : '▶'}</span>
                            </div>
                            {showInstructions && (
                                <>
                                    <p>Para acceso granular a repositorios específicos:</p>
                                    <ol>
                                        <li>Ve a GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens</li>
                                        <li>Crea un nuevo token y selecciona <strong>solo los repositorios</strong> que necesites</li>
                                        <li>Dale permiso de <strong>Contents (read)</strong></li>
                                        <li>Copia el token y pégalo arriba</li>
                                    </ol>
                                </>
                            )}
                        </div>
                    )}

                    {!status.connected && connectionMode === 'oauth' && (
                        <div className="github-info">
                            <p>Conecta tu cuenta de GitHub para:</p>
                            <ul>
                                <li>📂 Acceder a repositorios públicos y privados</li>
                                <li>🔍 Analizar código automáticamente</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Project Selection Modal */}
            {showProjectModal && (
                <div className="modal-overlay">
                    <div className="modal-content project-select-modal">
                        <h3>Seleccionar Proyecto</h3>
                        <p>¿En qué proyecto deseas guardar el análisis de <strong>{selectedRepoForAnalysis?.name}</strong>?</p>

                        <div className="form-group">
                            <label>Proyecto:</label>
                            <select
                                value={targetProjectId}
                                onChange={(e) => setTargetProjectId(e.target.value)}
                                className="project-select"
                            >
                                <option value="" disabled>Selecciona un proyecto</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={confirmAnalysis} disabled={!targetProjectId}>
                                Confirmar Análisis
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Project Selection Modal */}
            {showProjectModal && (
                <div className="modal-overlay">
                    <div className="modal-content project-select-modal">
                        <h3>Seleccionar Proyecto</h3>
                        <p>¿En qué proyecto deseas guardar el análisis de <strong>{selectedRepoForAnalysis?.name}</strong>?</p>

                        <div className="form-group">
                            <label>Proyecto:</label>
                            <select
                                value={targetProjectId}
                                onChange={(e) => setTargetProjectId(e.target.value)}
                                className="project-select"
                            >
                                <option value="" disabled>Selecciona un proyecto</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={confirmAnalysis} disabled={!targetProjectId}>
                                Confirmar Análisis
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GitHubConnect;
