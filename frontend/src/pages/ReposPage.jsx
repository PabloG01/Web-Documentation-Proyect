import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reposAPI, projectsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import EndpointPreview from '../components/EndpointPreview';
import ScoreBreakdown from '../components/ScoreBreakdown';
import { GitBranch, Plus, X, Folder, FileText, RefreshCw, Trash2, Eye, Zap, Lock, AlertTriangle, CheckCircle, Package, Search, Pencil, Code, Key } from '../components/Icons';
import '../styles/ReposPage.css';


function ReposPage({ embedded = false, onStatsChange }) {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Stats
    const [repos, setRepos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal / Form States
    const [showAddModal, setShowAddModal] = useState(false);
    const [repoUrl, setRepoUrl] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [filterProjectId, setFilterProjectId] = useState(''); // New filter state
    const [branch, setBranch] = useState('main');
    const [isPrivate, setIsPrivate] = useState(false);
    const [authToken, setAuthToken] = useState('');
    const [authUsername, setAuthUsername] = useState('');
    const [projects, setProjects] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState('');

    // Detail View States
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [repoFiles, setRepoFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [expandedScoreFileId, setExpandedScoreFileId] = useState(null);

    // Endpoint Preview
    const [previewFile, setPreviewFile] = useState(null);
    const [previewEndpoints, setPreviewEndpoints] = useState([]);

    const loadRepos = useCallback(async () => {
        try {
            setLoading(true);
            const response = await reposAPI.getAll(filterProjectId || null);
            setRepos(response.data || []);
        } catch (err) {
            console.error('Error loading repos:', err);
        } finally {
            setLoading(false);
        }
    }, [filterProjectId]);

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
        if (isPrivate && !authToken) {
            setError('El token es requerido para repositorios privados');
            return;
        }

        setAnalyzing(true);
        setError('');
        setAnalysisResult(null);

        try {
            // Pass authUsername/authToken only if private
            const tokenToSend = isPrivate ? authToken : null;
            const userToSend = isPrivate ? authUsername : null;

            const response = await reposAPI.analyze(repoUrl, selectedProjectId, branch, tokenToSend, userToSend);
            setAnalysisResult(response.data);
            loadRepos();

            // Close modal implies success in this flow? Or keep open to show result?
            // Let's close form and show result
            setShowAddModal(false);

            // Reset form
            setRepoUrl('');
            setBranch('main');
            setAuthToken('');
            setAuthUsername('');
            setIsPrivate(false);
            setSelectedProjectId('');

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
        setRepoFiles([]); // Clear previous

        try {
            const response = await reposAPI.getById(repo.id);
            setRepoFiles(response.data.files || []);
        } catch (err) {
            console.error('Error loading repo files:', err);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleResync = async (repoId) => {
        if (!window.confirm('¿Quieres re-sincronizar este repositorio?')) return;
        try {
            setLoading(true);
            await reposAPI.resync(repoId);
            alert('✅ Repositorio re-sincronizado');
            loadRepos();
            if (selectedRepo?.id === repoId) handleViewRepo(selectedRepo);
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
            if (selectedRepo?.id === repoId) setSelectedRepo(null);
            if (onStatsChange) onStatsChange();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    // Helper to extract endpoints for preview
    const handlePreviewEndpoints = (file) => {
        let endpoints = [];
        if (file.parsed_content) {
            try {
                const parsed = typeof file.parsed_content === 'string' ? JSON.parse(file.parsed_content) : file.parsed_content;
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

    const handleConfirmEndpoints = async (editedEndpoints) => {
        if (!previewFile || !selectedRepo) return;
        try {
            await reposAPI.generateSpec(selectedRepo.id, previewFile.id, {
                description: `Generado desde repositorio`,
                editedEndpoints: editedEndpoints
            });
            alert('✅ Especificación API generada correctamente');
            setPreviewFile(null);
            setPreviewEndpoints([]);
            handleViewRepo(selectedRepo);
            if (onStatsChange) onStatsChange();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleGenerateSpec = async (repoId, fileId) => {
        try {
            await reposAPI.generateSpec(repoId, fileId, { description: `Generado desde repositorio` });
            alert('✅ Especificación API generada correctamente');
            handleViewRepo(selectedRepo);
            if (onStatsChange) onStatsChange();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const getFrameworkBadge = (framework) => {
        const colors = { express: '#000000', nestjs: '#e0234e', nextjs: '#000000', laravel: '#ff2d20', fastify: '#000000', flask: '#000000' };
        return <span className="framework-badge" style={{ backgroundColor: colors[framework] || '#6366f1' }}>{framework || 'Unknown'}</span>;
    };

    if (!user) return <div className="repos-page"><div className="auth-required"><h2><Lock size={24} /> Inicia sesión</h2></div></div>;

    return (
        <div className="repos-page">
            <div className="page-header">
                <div>
                    <h1><GitBranch size={24} /> Mis Repositorios</h1>
                    <p>Gestiona tus conexiones individuales a repositorios Git</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        className="project-filter-select"
                        value={filterProjectId}
                        onChange={(e) => setFilterProjectId(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                        <option value="">Todos los Proyectos</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} /> Conectar Repositorio
                    </button>
                </div>
            </div>

            {/* Content Wrapper for Split Layout */}
            <div className={`repos-content-wrapper ${selectedRepo ? 'with-panel' : ''}`}>
                {/* Repos List Grid */}
                <div className="repos-list">
                    {loading ? (
                        <div className="loading">Cargando...</div>
                    ) : repos.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon"><Folder size={48} /></div>
                            <h3>No hay repositorios conectados</h3>
                            <p>Agrega una conexión individual para empezar a documentar.</p>
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                Conectar Ahora
                            </button>
                        </div>
                    ) : (
                        <div className="repos-grid">
                            {repos.map(repo => (
                                <div key={repo.id} className={`repo-card ${selectedRepo?.id === repo.id ? 'selected' : ''}`} onClick={() => handleViewRepo(repo)}>
                                    <div className="repo-header">
                                        <span className="repo-icon"><Folder size={20} /></span>
                                        <div className="repo-info">
                                            <h4 title={repo.repo_name}>{repo.repo_name}</h4>
                                            <span className="repo-branch"><GitBranch size={12} /> {repo.branch}</span>
                                        </div>
                                    </div>
                                    <div className="repo-meta">
                                        {repo.detected_framework && getFrameworkBadge(repo.detected_framework)}
                                        <span className="files-count">{repo.files_count} archivos</span>
                                    </div>
                                    <div className="repo-actions">
                                        <button className="btn btn-small" onClick={(e) => { e.stopPropagation(); handleResync(repo.id); }} title="Re-sincronizar">
                                            <RefreshCw size={14} />
                                        </button>
                                        <button className="btn btn-small btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(repo.id); }} title="Eliminar">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Repo Details (Files Panel) - Now inline */}
                {selectedRepo && (
                    <div className="files-panel">
                        <div className="panel-header">
                            <h3><FileText size={18} /> {selectedRepo.repo_name}</h3>
                            <button onClick={() => setSelectedRepo(null)}><X size={18} /></button>
                        </div>

                        {loadingFiles ? <div className="loading">Cargando estructura...</div> : repoFiles.length === 0 ? (
                            <div className="empty-state-panel">No se detectaron archivos documentables.</div>
                        ) : (
                            <div className="files-list">
                                {repoFiles.map(file => (
                                    <div key={file.id} className="file-item">
                                        <div className="file-info">
                                            <div className="file-path">{file.file_path}</div>
                                            <div className="file-badges">
                                                {file.has_swagger_comments && <span className="badge swagger">Swagger</span>}
                                                <span className="badge count">{file.endpoints_count} eps</span>
                                                <ScoreBreakdown
                                                    score={file.quality_score}
                                                    breakdown={file.quality_breakdown}
                                                    suggestions={file.quality_suggestions}
                                                    compact={true}
                                                    renderAsBadge={true}
                                                    isExpanded={expandedScoreFileId === file.id}
                                                    onExpand={(exp) => setExpandedScoreFileId(exp ? file.id : null)}
                                                />
                                            </div>
                                            {expandedScoreFileId === file.id && (
                                                <div className="file-score-detail">
                                                    <ScoreBreakdown score={file.quality_score} breakdown={file.quality_breakdown} suggestions={file.quality_suggestions} compact={false} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="file-actions">
                                            {file.has_spec ? (
                                                <button className="btn btn-small btn-success" onClick={() => navigate('/api-test?spec=' + file.api_spec_id)}><Eye size={12} /> Ver</button>
                                            ) : (
                                                <>
                                                    <button className="btn btn-small" onClick={() => handlePreviewEndpoints(file)}><Pencil size={12} /></button>
                                                    <button className="btn btn-small btn-primary" onClick={() => handleGenerateSpec(selectedRepo.id, file.id)}><Zap size={12} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Add Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content add-repo-modal">
                        <div className="modal-header">
                            <h3><GitBranch size={20} /> Conectar Nuevo Repositorio</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleAnalyze} className="add-repo-form">
                            <div className="form-group">
                                <label>URL del Repositorio (HTTPS)</label>
                                <input
                                    type="text"
                                    value={repoUrl}
                                    onChange={e => setRepoUrl(e.target.value)}
                                    placeholder="https://github.com/usuario/repo.git"
                                    required
                                    disabled={analyzing}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Proyecto</label>
                                    <select
                                        value={selectedProjectId}
                                        onChange={e => setSelectedProjectId(e.target.value)}
                                        required
                                        disabled={analyzing}
                                    >
                                        <option value="">Selecciona un proyecto...</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Rama (Branch)</label>
                                    <input
                                        type="text"
                                        value={branch}
                                        onChange={e => setBranch(e.target.value)}
                                        placeholder="main"
                                        disabled={analyzing}
                                    />
                                </div>
                            </div>

                            <div className="form-divider">
                                <div className="toggle-container">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={isPrivate}
                                            onChange={e => setIsPrivate(e.target.checked)}
                                            disabled={analyzing}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span className="toggle-label">Es un repositorio privado</span>
                                </div>
                            </div>

                            {isPrivate && (
                                <div className="auth-section">
                                    <div className="form-group">
                                        <label>Access Token / Password <span className="required">*</span></label>
                                        <div className="input-with-icon">
                                            <Key size={16} className="input-icon" />
                                            <input
                                                type="password"
                                                value={authToken}
                                                onChange={e => setAuthToken(e.target.value)}
                                                placeholder="Pegar token aquí..."
                                                required={isPrivate}
                                                disabled={analyzing}
                                            />
                                        </div>
                                        <small>GitHub Personal Access Token, Bitbucket Repository Token, etc.</small>
                                    </div>
                                </div>
                            )}

                            {error && <div className="error-message">⚠️ {error}</div>}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={analyzing}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={analyzing}>
                                    {analyzing ? 'Analizando...' : 'Conectar y Analizar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Analysis Result Modal */}
            {analysisResult && (
                <div className="modal-overlay">
                    <div className="modal-content result-modal">
                        <h3>✅ Análisis Completado</h3>
                        <div className="result-stats">
                            <div className="stat"><strong>{analysisResult.stats?.totalFiles}</strong> Archivos</div>
                            <div className="stat"><strong>{analysisResult.stats?.totalEndpoints}</strong> Endpoints</div>
                        </div>
                        <button className="btn btn-primary full-width" onClick={() => setAnalysisResult(null)}>Cerrar</button>
                    </div>
                </div>
            )}

            {/* Endpoint Preview Modal */}
            {previewFile && (
                <EndpointPreview
                    endpoints={previewEndpoints}
                    onConfirm={handleConfirmEndpoints}
                    onCancel={() => setPreviewFile(null)}
                    repoName={selectedRepo?.repo_name}
                    filePath={previewFile.file_path}
                />
            )}


        </div>
    );
}

export default ReposPage;
