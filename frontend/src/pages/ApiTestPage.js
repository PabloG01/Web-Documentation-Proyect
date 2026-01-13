import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import OpenApiViewer from '../components/OpenApiViewer';
import SpecEditor from '../components/SpecEditor';
import VersionHistory from '../components/VersionHistory';
import { projectsAPI, apiSpecsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ClipboardList, Folder, FileText, Trash2, Upload, Save, History, Plus, Pencil, AlertTriangle, CheckCircle, Code, ChevronRight, Loader } from '../components/Icons';
import '../styles/ApiTestPage.css';

function ApiTestPage({ embedded = false }) {
    const { user } = useContext(AuthContext);
    const [searchParams] = useSearchParams();
    const [spec, setSpec] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(''); // For Swagger parsing progress

    // Para guardar specs
    const [projects, setProjects] = useState([]);
    const [savedSpecs, setSavedSpecs] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [specName, setSpecName] = useState('');
    const [specDescription, setSpecDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [loadingSpecs, setLoadingSpecs] = useState(false);
    const [currentSpecId, setCurrentSpecId] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [viewerKey, setViewerKey] = useState(0); // Key para forzar recreación del visor
    const [expandedProjects, setExpandedProjects] = useState({}); // Estado para carpetas expandidas
    const [editingEndpoint, setEditingEndpoint] = useState(null); // Endpoint being edited
    const [isEditing, setIsEditing] = useState(false); // Edit mode active
    const [showVersionHistory, setShowVersionHistory] = useState(false); // Version history modal

    // Cargar proyectos y specs guardadas
    useEffect(() => {
        if (user) {
            loadProjects();
            loadSavedSpecs();
        }
    }, [user]);

    // Cargar spec desde URL si viene con parámetro ?spec=id
    useEffect(() => {
        const specIdFromUrl = searchParams.get('spec');
        if (specIdFromUrl && user) {
            loadSpecFromUrl(specIdFromUrl);
        }
    }, [searchParams, user]);

    const loadSpecFromUrl = async (specId) => {
        try {
            const response = await apiSpecsAPI.getById(specId);
            const savedSpec = response.data;
            setSpec(savedSpec.spec_content);
            setViewerKey(prev => prev + 1);
            setSpecName(savedSpec.name);
            setSpecDescription(savedSpec.description || '');
            setCurrentSpecId(savedSpec.id);
            setSelectedProjectId(savedSpec.project_id || '');
            setFileName(`${savedSpec.name} (guardado)`);
            setError('');
        } catch (err) {
            console.error('Error loading spec from URL:', err);
            setError('No se pudo cargar la especificación');
        }
    };

    const loadProjects = async () => {
        try {
            const response = await projectsAPI.getByUser();
            setProjects(response.data.data || []);
        } catch (err) {
            console.error('Error loading projects:', err);
        }
    };

    const loadSavedSpecs = async () => {
        setLoadingSpecs(true);
        try {
            const response = await apiSpecsAPI.getAll();
            setSavedSpecs(response.data || []);
        } catch (err) {
            console.error('Error loading saved specs:', err);
        } finally {
            setLoadingSpecs(false);
        }
    };


    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setError('');
        setProcessing('');
        setCurrentSpecId(null);
        setSpecName(file.name.replace(/\.(json|js)$/, ''));

        const isJSON = file.name.endsWith('.json');
        const isJavaScript = file.name.endsWith('.js');

        if (!isJSON && !isJavaScript) {
            setError('Solo se permiten archivos .json o .js');
            setSpec(null);
            return;
        }

        // Si es archivo JavaScript, parsearlo con el backend
        if (isJavaScript) {
            try {
                setProcessing('⏳ Analizando comentarios Swagger...');
                setError('');
                const response = await apiSpecsAPI.parseSwagger(file);

                const { spec, preview, sourceCode, message } = response.data;

                setSpec({
                    ...spec,
                    _metadata: {
                        source_type: 'swagger-comments',
                        source_code: sourceCode,
                        preview: preview,
                        message: message
                    }
                });
                setViewerKey(prev => prev + 1);
                setProcessing('');
                setError('');

                alert(`✅ ${message}\n\n` +
                    `📋 Endpoints encontrados: ${preview.endpointsCount}\n` +
                    `📦 Schemas: ${preview.schemas.length}`);

            } catch (err) {
                console.error('Error parsing Swagger:', err);
                setError('❌ ' + (err.response?.data?.error || err.message));
                setProcessing('');
                setSpec(null);
            }
            return;
        }

        // Si es JSON, procesarlo como antes
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);

                // Validación básica de OpenAPI
                if (!jsonContent.openapi && !jsonContent.swagger) {
                    setError('El archivo no parece ser una especificación OpenAPI válida (falta campo "openapi" o "swagger")');
                    setSpec(null);
                    return;
                }

                setSpec({
                    ...jsonContent,
                    _metadata: { source_type: 'json' }
                });
                setViewerKey(prev => prev + 1);
                setError('');
            } catch (err) {
                console.error('Error parsing JSON:', err);
                setError('Error al parsear el archivo JSON: ' + err.message);
                setSpec(null);
            }
        };

        reader.onerror = () => {
            setError('Error al leer el archivo');
            setSpec(null);
        };

        reader.readAsText(file);
    };

    const handleClear = () => {
        setSpec(null);
        setFileName('');
        setError('');
        setCurrentSpecId(null);
        setSpecName('');
        setSpecDescription('');
        document.getElementById('file-input').value = '';
    };

    const handleSaveSpec = async () => {
        if (!spec) {
            alert('No hay especificación para guardar');
            return;
        }
        if (!specName.trim()) {
            alert('Por favor ingresa un nombre para la especificación');
            return;
        }
        if (!selectedProjectId) {
            alert('Por favor selecciona un proyecto');
            return;
        }

        setSaving(true);
        try {
            // Extract metadata if present
            const { _metadata, ...cleanSpec } = spec;

            const specData = {
                project_id: selectedProjectId,
                name: specName.trim(),
                description: specDescription.trim(),
                spec_content: cleanSpec,
                source_type: _metadata?.source_type || 'json',
                source_code: _metadata?.source_code || null
            };

            if (currentSpecId) {
                await apiSpecsAPI.update(currentSpecId, specData);
                alert('Especificación actualizada correctamente');
            } else {
                const response = await apiSpecsAPI.create(specData);
                setCurrentSpecId(response.data.id);
                alert('Especificación guardada correctamente');
            }

            setShowSaveModal(false);
            loadSavedSpecs();
        } catch (err) {
            alert('Error al guardar: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleLoadSpec = async (savedSpec) => {
        setSpec(savedSpec.spec_content);
        setViewerKey(prev => prev + 1); // Forzar recreación del visor
        setSpecName(savedSpec.name);
        setSpecDescription(savedSpec.description || '');
        setCurrentSpecId(savedSpec.id);
        setSelectedProjectId(savedSpec.project_id || '');
        setFileName(`${savedSpec.name} (guardado)`);
        setError('');
    };

    const handleDeleteSpec = async (specId) => {
        if (!window.confirm('¿Estás seguro de eliminar esta especificación?')) return;

        try {
            await apiSpecsAPI.delete(specId);
            loadSavedSpecs();
            if (currentSpecId === specId) {
                handleClear();
            }
        } catch (err) {
            alert('Error al eliminar: ' + (err.response?.data?.error || err.message));
        }
    };

    // Agrupar specs por proyecto
    const groupSpecsByProject = (specs) => {
        const grouped = {};

        // Grupo "Sin clasificar" para specs sin proyecto
        grouped['uncategorized'] = {
            id: 'uncategorized',
            name: 'Sin clasificar',
            code: null,
            color: '#6b7280',
            specs: []
        };

        specs.forEach(spec => {
            if (spec.project_id) {
                if (!grouped[spec.project_id]) {
                    grouped[spec.project_id] = {
                        id: spec.project_id,
                        name: spec.project_name || 'Proyecto',
                        code: spec.project_code,
                        color: spec.project_color || '#6366f1',
                        specs: []
                    };
                }
                grouped[spec.project_id].specs.push(spec);
            } else {
                grouped['uncategorized'].specs.push(spec);
            }
        });

        // Retornar solo grupos con specs, ordenando proyectos primero y "Sin clasificar" al final
        const result = Object.values(grouped).filter(g => g.specs.length > 0);
        return result.sort((a, b) => {
            if (a.id === 'uncategorized') return 1;
            if (b.id === 'uncategorized') return -1;
            return (a.name || '').localeCompare(b.name || '');
        });
    };

    // Toggle para expandir/colapsar carpetas
    const toggleProjectFolder = (projectId) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    // Edit an endpoint in the current spec
    const handleEditEndpoint = (path, method) => {
        if (!spec || !spec.paths || !spec.paths[path]) return;

        const operation = spec.paths[path][method.toLowerCase()];
        if (!operation) return;

        setEditingEndpoint({
            path,
            method: method.toUpperCase(),
            summary: operation.summary || '',
            description: operation.description || '',
            tags: operation.tags || [],
            parameters: operation.parameters || [],
            requestBody: operation.requestBody || null,
            responses: Object.entries(operation.responses || {}).map(([code, data]) => ({
                code,
                description: data.description || ''
            })),
            requiresAuth: !!operation.security?.length
        });
        setIsEditing(true);
    };

    // Save edited endpoint back to spec
    const handleSaveEndpoint = (updatedEndpoint) => {
        if (!spec || !editingEndpoint) return;

        const newSpec = { ...spec };
        const originalPath = editingEndpoint.path;
        const originalMethod = editingEndpoint.method.toLowerCase();

        // Build the operation object
        const operation = {
            summary: updatedEndpoint.summary,
            description: updatedEndpoint.description,
            tags: updatedEndpoint.tags || [],
            parameters: updatedEndpoint.parameters || [],
            responses: {}
        };

        // Add auth if required
        if (updatedEndpoint.requiresAuth) {
            operation.security = [{ bearerAuth: [] }];
        }

        // Add request body if present
        if (updatedEndpoint.requestBody) {
            operation.requestBody = updatedEndpoint.requestBody;
        }

        // Build responses
        (updatedEndpoint.responses || []).forEach(resp => {
            operation.responses[resp.code] = {
                description: resp.description
            };
        });

        // Handle path/method change
        if (updatedEndpoint.path !== originalPath) {
            // Path changed - create new path entry
            if (!newSpec.paths[updatedEndpoint.path]) {
                newSpec.paths[updatedEndpoint.path] = {};
            }
            newSpec.paths[updatedEndpoint.path][updatedEndpoint.method.toLowerCase()] = operation;

            // Remove from old path
            delete newSpec.paths[originalPath][originalMethod];
            if (Object.keys(newSpec.paths[originalPath]).length === 0) {
                delete newSpec.paths[originalPath];
            }
        } else if (updatedEndpoint.method.toLowerCase() !== originalMethod) {
            // Only method changed
            newSpec.paths[originalPath][updatedEndpoint.method.toLowerCase()] = operation;
            delete newSpec.paths[originalPath][originalMethod];
        } else {
            // Same path and method - just update
            newSpec.paths[originalPath][originalMethod] = operation;
        }

        setSpec(newSpec);
        setViewerKey(prev => prev + 1);
        setEditingEndpoint(null);
        setIsEditing(false);
    };

    // Add new endpoint
    const handleAddEndpoint = () => {
        setEditingEndpoint({
            path: '/new-endpoint',
            method: 'GET',
            summary: '',
            description: '',
            tags: [],
            parameters: [],
            requestBody: null,
            responses: [{ code: '200', description: 'Successful response' }],
            requiresAuth: false
        });
        setIsEditing(true);
    };

    // Add new endpoint to spec
    const handleSaveNewEndpoint = (newEndpoint) => {
        if (!spec) return;

        const newSpec = { ...spec };
        if (!newSpec.paths) newSpec.paths = {};
        if (!newSpec.paths[newEndpoint.path]) {
            newSpec.paths[newEndpoint.path] = {};
        }

        const operation = {
            summary: newEndpoint.summary,
            description: newEndpoint.description,
            tags: newEndpoint.tags || [],
            parameters: newEndpoint.parameters || [],
            responses: {}
        };

        if (newEndpoint.requiresAuth) {
            operation.security = [{ bearerAuth: [] }];
        }

        if (newEndpoint.requestBody) {
            operation.requestBody = newEndpoint.requestBody;
        }

        (newEndpoint.responses || []).forEach(resp => {
            operation.responses[resp.code] = {
                description: resp.description
            };
        });

        newSpec.paths[newEndpoint.path][newEndpoint.method.toLowerCase()] = operation;

        setSpec(newSpec);
        setViewerKey(prev => prev + 1);
        setEditingEndpoint(null);
        setIsEditing(false);
    };

    // Delete an endpoint from spec
    const handleDeleteEndpoint = (path, method) => {
        if (!window.confirm(`¿Eliminar endpoint ${method.toUpperCase()} ${path}?`)) return;

        const newSpec = { ...spec };
        if (newSpec.paths && newSpec.paths[path]) {
            delete newSpec.paths[path][method.toLowerCase()];
            // If no more methods in this path, remove the path
            if (Object.keys(newSpec.paths[path]).length === 0) {
                delete newSpec.paths[path];
            }
        }
        setSpec(newSpec);
        setViewerKey(prev => prev + 1);
    };

    const groupedSpecs = groupSpecsByProject(savedSpecs);

    return (
        <div className="api-test-page">
            <div className="page-header">
                <h1>Visor de API OpenAPI</h1>
                <p>Carga un archivo JSON con la especificación OpenAPI para visualizar y probar la API</p>
            </div>

            <div className="api-test-layout">
                {/* Panel izquierdo - Specs guardadas */}
                {user && (
                    <div className="saved-specs-panel">
                        <h3><ClipboardList size={18} /> Specs Guardadas</h3>
                        {loadingSpecs ? (
                            <p className="loading-text">Cargando...</p>
                        ) : savedSpecs.length === 0 ? (
                            <p className="empty-text">No hay specs guardadas</p>
                        ) : (
                            <div className="specs-folder-container">
                                {groupedSpecs.map((group) => (
                                    <div key={group.id} className="project-folder">
                                        <div
                                            className="project-folder-header"
                                            onClick={() => toggleProjectFolder(group.id)}
                                            style={{ borderLeftColor: group.color }}
                                        >
                                            <span className={`folder-toggle-icon ${expandedProjects[group.id] ? 'expanded' : ''}`}>
                                                ▶
                                            </span>
                                            <span className="folder-icon"><Folder size={16} /></span>
                                            <span className="folder-name">
                                                {group.code ? `${group.code} - ${group.name}` : group.name}
                                            </span>
                                            <span className="folder-count">{group.specs.length}</span>
                                        </div>
                                        <div className={`project-folder-content ${expandedProjects[group.id] ? 'expanded' : ''}`}>
                                            {group.specs.map((savedSpec) => (
                                                <div
                                                    key={savedSpec.id}
                                                    className={`folder-spec-item ${currentSpecId === savedSpec.id ? 'active' : ''}`}
                                                >
                                                    <div className="spec-info" onClick={() => handleLoadSpec(savedSpec)}>
                                                        <span className="spec-icon"><FileText size={14} /></span>
                                                        <span className="spec-name">{savedSpec.name}</span>
                                                    </div>
                                                    <button
                                                        className="btn-delete-spec"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteSpec(savedSpec.id); }}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Panel principal */}
                <div className="main-panel">
                    <div className="upload-section">
                        <div className="upload-card">
                            <label htmlFor="file-input" className="upload-label">
                                <div className="upload-icon"><Upload size={32} /></div>
                                <div className="upload-text">
                                    {fileName ? fileName : 'Selecciona un archivo .json o .js'}
                                </div>
                                <div className="upload-hint">
                                    Haz clic para seleccionar o arrastra un archivo aquí
                                </div>
                            </label>
                            <input
                                id="file-input"
                                type="file"
                                accept=".json,.js,application/json,text/javascript"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />

                            <div className="upload-actions">
                                {fileName && (
                                    <button className="btn btn-secondary" onClick={handleClear}>
                                        <Trash2 size={16} /> Limpiar
                                    </button>
                                )}
                                {spec && user && (
                                    <button className="btn btn-primary" onClick={() => setShowSaveModal(true)}>
                                        <Save size={16} /> {currentSpecId ? 'Actualizar' : 'Guardar'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="error-message">
                                <AlertTriangle size={16} /> {error}
                            </div>
                        )}

                        {processing && (
                            <div className="processing-message">
                                <p>{processing}</p>
                            </div>
                        )}

                        {spec && !error && (
                            <div className="success-message">
                                <CheckCircle size={16} /> Especificación cargada correctamente
                                {currentSpecId && <span> (guardada)</span>}
                            </div>
                        )}
                    </div>

                    {spec && (
                        <div className="viewer-section">
                            <div className="viewer-toolbar">
                                <button
                                    className="btn btn-small btn-primary"
                                    onClick={handleAddEndpoint}
                                    title="Añadir nuevo endpoint"
                                >
                                    <Plus size={16} /> Añadir Endpoint
                                </button>
                                {currentSpecId && (
                                    <>
                                        <button
                                            className="btn btn-small"
                                            onClick={() => setShowSaveModal(true)}
                                        >
                                            <Save size={16} /> Guardar Cambios
                                        </button>
                                        <button
                                            className="btn btn-small"
                                            onClick={() => setShowVersionHistory(true)}
                                            title="Ver historial de versiones"
                                        >
                                            <History size={16} /> Historial
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Editable Endpoints List */}
                            <div className="endpoints-editor">
                                <h4><Pencil size={16} /> Endpoints ({Object.keys(spec.paths || {}).reduce((acc, path) => acc + Object.keys(spec.paths[path]).length, 0)})</h4>
                                <div className="endpoints-list">
                                    {Object.entries(spec.paths || {}).map(([path, methods]) => (
                                        Object.entries(methods).map(([method, operation]) => {
                                            if (['parameters', 'servers', 'summary', 'description'].includes(method)) return null;
                                            const methodColors = {
                                                get: '#22c55e', post: '#3b82f6', put: '#f59e0b',
                                                patch: '#8b5cf6', delete: '#ef4444'
                                            };
                                            return (
                                                <div
                                                    key={`${path}-${method}`}
                                                    className="endpoint-edit-row"
                                                    onClick={() => handleEditEndpoint(path, method)}
                                                >
                                                    <span
                                                        className="method-tag"
                                                        style={{ backgroundColor: methodColors[method] || '#6b7280' }}
                                                    >
                                                        {method.toUpperCase()}
                                                    </span>
                                                    <span className="endpoint-path">{path}</span>
                                                    <span className="endpoint-summary">{operation.summary || '-'}</span>
                                                    <button className="btn-edit" title="Editar endpoint"><Pencil size={14} /></button>
                                                    <button
                                                        className="btn-delete"
                                                        title="Eliminar endpoint"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteEndpoint(path, method);
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ))}
                                </div>
                            </div>

                            {/* Swagger Viewer */}
                            <OpenApiViewer key={viewerKey} spec={spec} />
                        </div>
                    )}

                    {/* Spec Editor Modal */}
                    {isEditing && editingEndpoint && (
                        <SpecEditor
                            endpoint={editingEndpoint}
                            onSave={editingEndpoint.path === '/new-endpoint' && !spec?.paths?.['/new-endpoint']
                                ? handleSaveNewEndpoint
                                : handleSaveEndpoint}
                            onCancel={() => { setIsEditing(false); setEditingEndpoint(null); }}
                            mode={editingEndpoint.path === '/new-endpoint' ? 'create' : 'edit'}
                        />
                    )}

                    {!spec && !error && (
                        <div className="placeholder">
                            <div className="placeholder-icon"><Code size={48} /></div>
                            <h3>No hay especificación cargada</h3>
                            <p>Sube un archivo JSON con la especificación OpenAPI 3.0 para comenzar</p>
                            {user && savedSpecs.length > 0 && (
                                <p className="hint">O selecciona una especificación guardada del panel izquierdo</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal para guardar */}
            {showSaveModal && (
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{currentSpecId ? 'Actualizar Especificación' : 'Guardar Especificación'}</h2>

                        <div className="form-group">
                            <label>Nombre *</label>
                            <input
                                type="text"
                                value={specName}
                                onChange={(e) => setSpecName(e.target.value)}
                                placeholder="Nombre de la especificación"
                            />
                        </div>

                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea
                                value={specDescription}
                                onChange={(e) => setSpecDescription(e.target.value)}
                                placeholder="Descripción opcional"
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label>Proyecto *</label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                required
                            >
                                <option value="">-- Selecciona un proyecto --</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.code} - {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowSaveModal(false)}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveSpec}
                                disabled={saving || !specName.trim() || !selectedProjectId}
                            >
                                {saving ? <><Loader size={16} className="spin" /> Guardando...</> : <><Save size={16} /> Guardar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Version History Modal */}
            {showVersionHistory && currentSpecId && (
                <VersionHistory
                    specId={currentSpecId}
                    onRestore={(restoredSpec) => {
                        setSpec(restoredSpec.spec_content);
                        setViewerKey(prev => prev + 1);
                    }}
                    onClose={() => setShowVersionHistory(false)}
                />
            )}
        </div>
    );
}

export default ApiTestPage;
