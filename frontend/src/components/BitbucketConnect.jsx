import React, { useState, useEffect } from 'react';
import { bitbucketAPI, projectsAPI } from '../services/api';
import '../styles/BitbucketConnect.css';
import '../styles/AccordionStyles.css';

const API_URL = `http://${window.location.hostname}:5000`;

function BitbucketConnect({ onRepoAnalyzed, projectId, projects = [] }) {
    const [status, setStatus] = useState({ connected: false, loading: true });
    const [repos, setRepos] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [analyzing, setAnalyzing] = useState(null);
    const [error, setError] = useState('');

    // Accordion state
    const [isExpanded, setIsExpanded] = useState(false);

    // Modal state
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [selectedRepoForAnalysis, setSelectedRepoForAnalysis] = useState(null);
    const [targetProjectId, setTargetProjectId] = useState(projectId || (projects[0]?.id) || '');

    // Manual connection states
    const [connectionMode, setConnectionMode] = useState('oauth'); // 'oauth' or 'manual'
    const [manualEmail, setManualEmail] = useState('');
    const [manualApiToken, setManualApiToken] = useState('');
    const [connectingManual, setConnectingManual] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        checkStatus();
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

    const handleConnect = async () => {
        try {
            // Check if OAuth is configured before redirecting
            const response = await fetch(`${API_URL}/bitbucket/auth/bitbucket/oauth-status`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (!data.configured) {
                setError('⚠️ OAuth no configurado. Por favor, configura tus credenciales OAuth primero haciendo click en "⚙️ Configurar OAuth Apps".');
                return;
            }

            // If configured, proceed with OAuth flow
            window.location.href = bitbucketAPI.getOAuthUrl();
        } catch (err) {
            console.error('Error checking OAuth status:', err);
            setError('Error al verificar configuración OAuth');
        }
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
                body: JSON.stringify({ email: manualEmail, apiToken: manualApiToken })
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

            setManualEmail('');
            setManualApiToken('');
            setConnectionMode('oauth');
            loadRepos();

        } catch (err) {
            console.error('Manual connection error:', err);
            setError(err.message || 'Error al conectar con API Token');
        } finally {
            setConnectingManual(false);
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
            setError('Selecciona un proyecto para guardar el análisis');
            return;
        }

        const repo = selectedRepoForAnalysis;
        setShowProjectModal(false);
        setAnalyzing(repo.fullName);
        setError('');

        try {
            console.log(`Analyzing ${repo.fullName} for project ${targetProjectId}...`);
            const res = await bitbucketAPI.analyzeRepo(
                repo.workspace.slug,
                repo.slug,
                targetProjectId,
                repo.mainbranch?.name || 'master'
            );

            console.log('Analysis result:', res);
            if (onRepoAnalyzed) onRepoAnalyzed(res);
            alert('✅ Análisis completado correctamente');

        } catch (err) {
            console.error('Analysis error:', err);
            setError(err.message || 'Error al analizar repositorio');
        } finally {
            setAnalyzing(null);
            setSelectedRepoForAnalysis(null);
        }
    };

    if (status.loading) {
        return <div className="bitbucket-connect loading">Cargando...</div>;
    }

    return (
        <div className="bitbucket-connect-accordion">
            {/* Accordion Header */}
            <div
                className="accordion-header"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: 'pointer' }}
            >
                <div className="accordion-header-content">
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    <span className="tab-icon">🪣</span>
                    <span className="accordion-title">Bitbucket</span>
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
                                        API Token
                                    </button>
                                </div>

                                {connectionMode === 'oauth' ? (
                                    <button className="btn btn-small btn-primary" onClick={handleConnect}>
                                        Conectar con OAuth
                                    </button>
                                ) : (
                                    <form onSubmit={connectManual} className="manual-connect-form">
                                        <input
                                            type="email"
                                            placeholder="Email (opcional para Repo Tokens)"
                                            value={manualEmail}
                                            onChange={(e) => setManualEmail(e.target.value)}
                                            className="username-input"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Atlassian API Token / Repo Token"
                                            value={manualApiToken}
                                            onChange={(e) => setManualApiToken(e.target.value)}
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
                                                onClick={() => initiateAnalysis(repo)}
                                                disabled={analyzing === repo.fullName}
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
                                <h4 style={{ margin: 0 }}>🔑 Usa un API Token</h4>
                                <span style={{ fontSize: '1.2rem' }}>{showInstructions ? '▼' : '▶'}</span>
                            </div>
                            {showInstructions && (
                                <>
                                    <p>Para conectar con credenciales específicas:</p>
                                    <ol>
                                        <li>Ve a <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">Atlassian Security → API tokens</a></li>
                                        <li>Click en <strong>"Create API token"</strong></li>
                                        <li>Asigna un nombre (ej: "Gestor Documentacion")</li>
                                        <li>Copia el token generado e ingrésalo arriba junto con tu email de Atlassian</li>
                                    </ol>
                                </>
                            )}
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
        </div>
    );
}

export default BitbucketConnect;
