import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reposAPI, projectsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import EndpointPreview from '../components/EndpointPreview';
import ScoreBreakdown from '../components/ScoreBreakdown';
import OAuthSetupCard from '../components/OAuthSetupCard';
import { GitBranch, Plus, X, Folder, FileText, RefreshCw, Trash2, Eye, Zap, Lock, AlertTriangle, CheckCircle, Package, Search, Pencil, Code } from '../components/Icons';
// import GitHubConnect from '../components/GitHubConnect'; // Uncomment when GitHub OAuth is configured
import '../styles/ReposPage.css';
import '../styles/ReposPageOAuth.css';

function ReposPage({ embedded = false, onStatsChange }) {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // State for repos list
    const [repos, setRepos] = useState([]);
    const [loading, setLoading] = useState(true);

    // State for analysis form
    const [showAnalyzeForm, setShowAnalyzeForm] = useState(false);
    const [repoUrl, setRepoUrl] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [branch, setBranch] = useState('main');
    const [authToken, setAuthToken] = useState('');
    const [projects, setProjects] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState('');

    // State for repo details
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [repoFiles, setRepoFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    // State for endpoint preview
    const [previewFile, setPreviewFile] = useState(null);
    const [previewEndpoints, setPreviewEndpoints] = useState([]);

    // State for score breakdown
    const [expandedScoreFileId, setExpandedScoreFileId] = useState(null);

    // State for OAuth Setup modal
    const [showOAuthSetup, setShowOAuthSetup] = useState(false);

    const loadRepos = useCallback(async () => {
        try {
            setLoading(true);
            const response = await reposAPI.getAll();
            setRepos(response.data || []);
        } catch (err) {
            console.error('Error loading repos:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadProjects = useCallback(async () => {
        try {
            const response = await projectsAPI.getByUser();
            setProjects(response.data.data || []);
        } catch (err) {
            console.error('Error loading projects:', err);
        }
    }, []);

    useEffect(() => {
        if (user) {
            loadRepos();
            loadProjects();
        }
    }, [user, loadRepos, loadProjects]);

    const handleAnalyze = async (e) => {
        e.preventDefault();

        if (!repoUrl.trim()) {
            setError('Ingresa la URL del repositorio');
            return;
        }
        if (!selectedProjectId) {
            setError('Selecciona un proyecto');
            return;
        }

        setAnalyzing(true);
        setError('');
        setAnalysisResult(null);

        try {
            const response = await reposAPI.analyze(repoUrl, selectedProjectId, branch, authToken || null);
            setAnalysisResult(response.data);
            loadRepos();
            setShowAnalyzeForm(false);
            setRepoUrl('');
            setBranch('main');
            setAuthToken('');
            setSelectedProjectId('');
            // Notify parent to update stats
            if (onStatsChange) onStatsChange();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al analizar el repositorio');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleViewRepo = async (repo) => {
        setSelectedRepo(repo);
        setLoadingFiles(true);

        try {
            const response = await reposAPI.getById(repo.id);
            setRepoFiles(response.data.files || []);
        } catch (err) {
            console.error('Error loading repo files:', err);
        } finally {
            setLoadingFiles(false);
        }
    };

    // Open preview modal for a file
    const handlePreviewEndpoints = (file) => {
        // Parse endpoints from parsed_content if available
        let endpoints = [];
        if (file.parsed_content) {
            try {
                const parsed = typeof file.parsed_content === 'string'
                    ? JSON.parse(file.parsed_content)
                    : file.parsed_content;

                // Extract endpoints from OpenAPI paths
                if (parsed.paths) {
                    for (const [path, methods] of Object.entries(parsed.paths)) {
                        for (const [method, details] of Object.entries(methods)) {
                            if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
                                endpoints.push({
                                    method: method.toUpperCase(),
                                    path: path,
                                    summary: details.summary || `${method.toUpperCase()} ${path}`
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Error parsing endpoints:', err);
            }
        }

        setPreviewFile(file);
        setPreviewEndpoints(endpoints);
    };

    // Handle confirmed endpoints from preview
    const handleConfirmEndpoints = async (editedEndpoints) => {
        if (!previewFile || !selectedRepo) return;

        try {
            // Generate spec with edited endpoints (let backend handle naming)
            await reposAPI.generateSpec(selectedRepo.id, previewFile.id, {
                description: `Generado desde repositorio`,
                editedEndpoints: editedEndpoints
            });
            alert('✅ Especificación API generada correctamente');
            setPreviewFile(null);
            setPreviewEndpoints([]);
            handleViewRepo(selectedRepo);
            // Notify parent to update stats
            if (onStatsChange) onStatsChange();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleCancelPreview = () => {
        setPreviewFile(null);
        setPreviewEndpoints([]);
    };

    const handleGenerateSpec = async (repoId, fileId, filePath) => {
        try {
            // Let backend generate the name using project code and repo info
            await reposAPI.generateSpec(repoId, fileId, {
                description: `Generado desde repositorio`
            });
            alert('✅ Especificación API generada correctamente');
            handleViewRepo(selectedRepo);
            // Notify parent to update stats
            if (onStatsChange) onStatsChange();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleResync = async (repoId) => {
        if (!window.confirm('¿Quieres re-sincronizar este repositorio?')) return;

        try {
            setLoading(true);
            await reposAPI.resync(repoId);
            alert('✅ Repositorio re-sincronizado');
            loadRepos();
            if (selectedRepo?.id === repoId) {
                handleViewRepo(selectedRepo);
            }
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (repoId) => {
        if (!window.confirm('¿Seguro que quieres eliminar esta conexión?')) return;

        try {
            await reposAPI.delete(repoId);
            loadRepos();
            if (selectedRepo?.id === repoId) {
                setSelectedRepo(null);
                setRepoFiles([]);
            }
            // Notify parent to update stats
            if (onStatsChange) onStatsChange();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const getQualityBadge = (score) => {
        if (score >= 71) return <span className="quality-badge good">🟢 {score}%</span>;
        if (score >= 41) return <span className="quality-badge partial">🟡 {score}%</span>;
        return <span className="quality-badge basic">🔴 {score}%</span>;
    };

    const getFrameworkBadge = (framework) => {
        const colors = {
            express: '#000000',
            nestjs: '#e0234e',
            nextjs: '#000000',
            laravel: '#ff2d20',
            symfony: '#000000',
            fastapi: '#009688',
            flask: '#000000'
        };
        return (
            <span
                className="framework-badge"
                style={{ backgroundColor: colors[framework] || '#6366f1' }}
            >
                {framework || 'Unknown'}
            </span>
        );
    };

    if (!user) {
        return (
            <div className="repos-page">
                <div className="auth-required">
                    <h2><Lock size={24} /> Inicia sesión</h2>
                    <p>Necesitas iniciar sesión para conectar repositorios</p>
                </div>
            </div>
        );
    }

    return (
        <div className="repos-page">
            <div className="page-header">
                <div>
                    <h1><GitBranch size={24} /> Repositorios Git</h1>
                    <p>Conecta repositorios para generar documentación automáticamente</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAnalyzeForm(!showAnalyzeForm)}
                >
                    {showAnalyzeForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Conectar Repositorio</>}
                </button>
            </div>

            {/* Endpoint Preview Modal */}
            {previewFile && (
                <EndpointPreview
                    endpoints={previewEndpoints}
                    onConfirm={handleConfirmEndpoints}
                    onCancel={handleCancelPreview}
                    repoName={selectedRepo?.repo_name}
                    filePath={previewFile.file_path}
                />
            )}

            {/* GitHub Connect - Descomentar cuando se configuren GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET
            <div className="github-section">
                <GitHubConnect
                    projectId={selectedProjectId || projects[0]?.id}
                    onRepoSelect={(result) => {
                        loadRepos();
                        setAnalysisResult(result.analysis);
                    }}
                />
            </div>
            */}

            {/* OAuth Configuration Button */}
            <div className="oauth-setup-trigger">
                <button
                    className="btn btn-secondary"
                    onClick={() => setShowOAuthSetup(true)}
                >
                    ⚙️ Configurar OAuth Apps
                </button>
            </div>

            {/* OAuth Configuration Modal */}
            {showOAuthSetup && (
                <div className="oauth-modal-overlay" onClick={() => setShowOAuthSetup(false)}>
                    <div className="oauth-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="oauth-modal-header">
                            <h2>⚙️ Configurar Credenciales OAuth</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setShowOAuthSetup(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="oauth-modal-content">
                            <p className="oauth-description">
                                Configura tus propias credenciales OAuth para acceder a repositorios privados de GitHub y Bitbucket.
                            </p>
                            <div className="oauth-cards-grid">
                                <OAuthSetupCard
                                    provider="github"
                                    providerName="GitHub"
                                    onSave={() => {
                                        console.log('GitHub OAuth configured');
                                        setTimeout(() => setShowOAuthSetup(false), 1500);
                                    }}
                                />
                                <OAuthSetupCard
                                    provider="bitbucket"
                                    providerName="Bitbucket"
                                    onSave={() => {
                                        console.log('Bitbucket OAuth configured');
                                        setTimeout(() => setShowOAuthSetup(false), 1500);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Form */}
            {showAnalyzeForm && (
                <div className="analyze-form-container">
                    <form onSubmit={handleAnalyze} className="analyze-form">
                        <h3>Analizar Repositorio</h3>

                        <div className="form-group">
                            <label>URL del Repositorio *</label>
                            <input
                                type="text"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                placeholder="https://github.com/usuario/repositorio"
                                disabled={analyzing}
                            />
                            <small>Soportamos GitHub, GitLab y Bitbucket</small>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Proyecto *</label>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    disabled={analyzing}
                                >
                                    <option value="">-- Selecciona proyecto --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} - {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Branch</label>
                                <input
                                    type="text"
                                    value={branch}
                                    onChange={(e) => setBranch(e.target.value)}
                                    placeholder="main"
                                    disabled={analyzing}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>🔑 Token de acceso (opcional)</label>
                            <input
                                type="password"
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                placeholder="Requerido para repositorios privados"
                                disabled={analyzing}
                            />
                            <small>Personal Access Token de GitHub/Bitbucket/GitLab para repos privados</small>
                        </div>

                        {error && <div className="error-message">⚠️ {error}</div>}

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={analyzing}
                            >
                                {analyzing ? '⏳ Analizando...' : '🔍 Analizar'}
                            </button>
                        </div>

                        {analyzing && (
                            <div className="analyzing-status">
                                <div className="spinner"></div>
                                <p>Clonando y analizando repositorio...</p>
                                <small>Esto puede tomar unos segundos</small>
                            </div>
                        )}
                    </form>
                </div>
            )}

            {/* Analysis Result Modal */}
            {analysisResult && (
                <div className="analysis-result">
                    <div className="result-header">
                        <h3>✅ Análisis Completado</h3>
                        <button onClick={() => setAnalysisResult(null)}>✕</button>
                    </div>
                    <div className="result-stats">
                        <div className="stat">
                            <span className="stat-value">{analysisResult.analysis.stats.totalFiles}</span>
                            <span className="stat-label">Archivos API</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{analysisResult.analysis.stats.filesWithSwagger}</span>
                            <span className="stat-label">Con Swagger</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{analysisResult.analysis.stats.totalEndpoints}</span>
                            <span className="stat-label">Endpoints</span>
                        </div>
                        <div className="stat">
                            {getQualityBadge(analysisResult.analysis.stats.averageQuality)}
                            <span className="stat-label">Calidad Promedio</span>
                        </div>
                    </div>
                    {analysisResult.analysis.framework?.primary && (
                        <div className="detected-framework">
                            Framework detectado: {getFrameworkBadge(analysisResult.analysis.framework.primary)}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="repos-content">
                {/* Repos List */}
                <div className="repos-list">
                    <h3><Package size={18} /> Repositorios Conectados</h3>

                    {loading ? (
                        <div className="loading">Cargando...</div>
                    ) : repos.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay repositorios conectados</p>
                            <small>Conecta un repositorio para comenzar</small>
                        </div>
                    ) : (
                        <div className="repos-grid">
                            {repos.map(repo => (
                                <div
                                    key={repo.id}
                                    className={`repo-card ${selectedRepo?.id === repo.id ? 'selected' : ''}`}
                                    onClick={() => handleViewRepo(repo)}
                                >
                                    <div className="repo-header">
                                        <span className="repo-icon"><Folder size={20} /></span>
                                        <div className="repo-info">
                                            <h4>{repo.repo_name}</h4>
                                            <span className="repo-project">{repo.project_code}</span>
                                        </div>
                                    </div>
                                    <div className="repo-meta">
                                        {repo.detected_framework && getFrameworkBadge(repo.detected_framework)}
                                        <span className="files-count">{repo.files_count} archivo(s)</span>
                                    </div>
                                    <div className="repo-actions">
                                        <button
                                            className="btn btn-small"
                                            onClick={(e) => { e.stopPropagation(); handleResync(repo.id); }}
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                        <button
                                            className="btn btn-small btn-danger"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(repo.id); }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Files Panel */}
                {selectedRepo && (
                    <div className="files-panel">
                        <div className="panel-header">
                            <h3><FileText size={18} /> Archivos de {selectedRepo.repo_name}</h3>
                            <button onClick={() => setSelectedRepo(null)}><X size={18} /></button>
                        </div>

                        {loadingFiles ? (
                            <div className="loading">Cargando archivos...</div>
                        ) : repoFiles.length === 0 ? (
                            <div className="empty-state">
                                <p>No se encontraron archivos API</p>
                            </div>
                        ) : (
                            <div className="files-list">
                                {repoFiles.map(file => (
                                    <div key={file.id} className="file-item">
                                        <div className="file-info">
                                            <span className="file-path">{file.file_path}</span>
                                            <div className="file-meta">
                                                {file.has_swagger_comments && (
                                                    <span className="swagger-badge"><Pencil size={12} /> Swagger</span>
                                                )}
                                                {file.file_type && file.file_type !== 'unknown' && (
                                                    <span className={`analyzer-badge ${file.file_type.includes('+AI') ? 'ai-enhanced' : ''}`}>
                                                        {file.file_type.includes('+AI') ? <Zap size={10} /> : <Code size={10} />} {file.file_type}
                                                    </span>
                                                )}
                                                <span className="endpoints-count">{file.endpoints_count} endpoints</span>
                                                <ScoreBreakdown
                                                    score={file.quality_score}
                                                    breakdown={file.quality_breakdown}
                                                    suggestions={file.quality_suggestions}
                                                    compact={true}
                                                    renderAsBadge={true}
                                                    isExpanded={expandedScoreFileId === file.id}
                                                    onExpand={(expanded) => setExpandedScoreFileId(expanded ? file.id : null)}
                                                />
                                            </div>
                                            {expandedScoreFileId === file.id && (
                                                <div className="file-score-detail">
                                                    <ScoreBreakdown
                                                        score={file.quality_score}
                                                        breakdown={file.quality_breakdown}
                                                        suggestions={file.quality_suggestions}
                                                        compact={false}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="file-actions">
                                            {file.has_spec ? (
                                                <button
                                                    className="btn btn-small btn-success"
                                                    onClick={() => navigate('/api-test?spec=' + file.api_spec_id)}
                                                >
                                                    <Eye size={14} /> Ver Spec
                                                </button>
                                            ) : file.parsed_content ? (
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn btn-small"
                                                        onClick={() => handlePreviewEndpoints(file)}
                                                        title="Revisar endpoints antes de generar"
                                                    >
                                                        <Pencil size={14} /> Revisar
                                                    </button>
                                                    <button
                                                        className="btn btn-small btn-primary"
                                                        onClick={() => handleGenerateSpec(selectedRepo.id, file.id, file.file_path)}
                                                        title="Generar spec directamente"
                                                    >
                                                        <Zap size={14} /> Generar
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="no-content">Sin contenido</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReposPage;

