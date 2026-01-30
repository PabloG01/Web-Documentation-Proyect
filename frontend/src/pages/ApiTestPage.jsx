import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import OpenApiViewer from '../components/OpenApiViewer';
import SpecEditor from '../components/SpecEditor';
import VersionHistory from '../components/VersionHistory';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { SavedSpecsPanel, FileUploadCard, EndpointsList } from '../components/api';
import { projectsAPI, apiSpecsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Plus, Save, History, AlertTriangle, CheckCircle, Code, Loader } from '../components/Icons';
import '../styles/ApiTestPage.css';

function ApiTestPage({ embedded = false }) {
    const { user } = useContext(AuthContext);
    const [searchParams] = useSearchParams();
    const [spec, setSpec] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState('');

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
    const [viewerKey, setViewerKey] = useState(0);
    const [expandedProjects, setExpandedProjects] = useState({});
    const [editingEndpoint, setEditingEndpoint] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);

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

        if (isJavaScript) {
            try {
                setProcessing('Analizando comentarios Swagger...');
                setError('');
                const response = await apiSpecsAPI.parseSwagger(file);
                const { spec: parsedSpec, preview, sourceCode, message } = response.data;

                setSpec({
                    ...parsedSpec,
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

                alert(`${message}\n\nEndpoints encontrados: ${preview.endpointsCount}\nSchemas: ${preview.schemas.length}`);
            } catch (err) {
                console.error('Error parsing Swagger:', err);
                setError(err.response?.data?.error || err.message);
                setProcessing('');
                setSpec(null);
            }
            return;
        }

        // JSON file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                if (!jsonContent.openapi && !jsonContent.swagger) {
                    setError('El archivo no parece ser una especificación OpenAPI válida');
                    setSpec(null);
                    return;
                }
                setSpec({ ...jsonContent, _metadata: { source_type: 'json' } });
                setViewerKey(prev => prev + 1);
                setError('');
            } catch (err) {
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
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
    };

    const handleSaveSpec = async () => {
        if (!spec || !specName.trim() || !selectedProjectId) {
            alert('Por favor completa todos los campos requeridos');
            return;
        }

        setSaving(true);
        try {
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
        setViewerKey(prev => prev + 1);
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
            if (currentSpecId === specId) handleClear();
        } catch (err) {
            alert('Error al eliminar: ' + (err.response?.data?.error || err.message));
        }
    };

    const toggleProjectFolder = (projectId) => {
        setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
    };

    // Endpoint editing handlers
    const handleEditEndpoint = (path, method) => {
        if (!spec?.paths?.[path]) return;
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
                code, description: data.description || ''
            })),
            requiresAuth: !!operation.security?.length
        });
        setIsEditing(true);
    };

    const handleSaveEndpoint = (updatedEndpoint) => {
        if (!spec || !editingEndpoint) return;
        const newSpec = { ...spec };
        const originalPath = editingEndpoint.path;
        const originalMethod = editingEndpoint.method.toLowerCase();

        const operation = {
            summary: updatedEndpoint.summary,
            description: updatedEndpoint.description,
            tags: updatedEndpoint.tags || [],
            parameters: updatedEndpoint.parameters || [],
            responses: {}
        };

        if (updatedEndpoint.requiresAuth) operation.security = [{ bearerAuth: [] }];
        if (updatedEndpoint.requestBody) operation.requestBody = updatedEndpoint.requestBody;
        (updatedEndpoint.responses || []).forEach(resp => {
            operation.responses[resp.code] = { description: resp.description };
        });

        if (updatedEndpoint.path !== originalPath) {
            if (!newSpec.paths[updatedEndpoint.path]) newSpec.paths[updatedEndpoint.path] = {};
            newSpec.paths[updatedEndpoint.path][updatedEndpoint.method.toLowerCase()] = operation;
            delete newSpec.paths[originalPath][originalMethod];
            if (Object.keys(newSpec.paths[originalPath]).length === 0) delete newSpec.paths[originalPath];
        } else if (updatedEndpoint.method.toLowerCase() !== originalMethod) {
            newSpec.paths[originalPath][updatedEndpoint.method.toLowerCase()] = operation;
            delete newSpec.paths[originalPath][originalMethod];
        } else {
            newSpec.paths[originalPath][originalMethod] = operation;
        }

        setSpec(newSpec);
        setViewerKey(prev => prev + 1);
        setEditingEndpoint(null);
        setIsEditing(false);
    };

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

    const handleSaveNewEndpoint = (newEndpoint) => {
        if (!spec) return;
        const newSpec = { ...spec, paths: { ...spec.paths } };
        if (!newSpec.paths[newEndpoint.path]) newSpec.paths[newEndpoint.path] = {};

        const operation = {
            summary: newEndpoint.summary,
            description: newEndpoint.description,
            tags: newEndpoint.tags || [],
            parameters: newEndpoint.parameters || [],
            responses: {}
        };

        if (newEndpoint.requiresAuth) operation.security = [{ bearerAuth: [] }];
        if (newEndpoint.requestBody) operation.requestBody = newEndpoint.requestBody;
        (newEndpoint.responses || []).forEach(resp => {
            operation.responses[resp.code] = { description: resp.description };
        });

        newSpec.paths[newEndpoint.path][newEndpoint.method.toLowerCase()] = operation;
        setSpec(newSpec);
        setViewerKey(prev => prev + 1);
        setEditingEndpoint(null);
        setIsEditing(false);
    };

    const handleDeleteEndpoint = (path, method) => {
        if (!window.confirm(`¿Eliminar endpoint ${method.toUpperCase()} ${path}?`)) return;
        const newSpec = { ...spec };
        if (newSpec.paths?.[path]) {
            delete newSpec.paths[path][method.toLowerCase()];
            if (Object.keys(newSpec.paths[path]).length === 0) delete newSpec.paths[path];
        }
        setSpec(newSpec);
        setViewerKey(prev => prev + 1);
    };

    return (
        <div className="api-test-page">
            <div className="page-header">
                <h1>Visor de API OpenAPI</h1>
                <p>Carga un archivo JSON con la especificación OpenAPI para visualizar y probar la API</p>
            </div>

            <div className="api-test-layout">
                {/* Left Panel - Saved Specs */}
                {user && (
                    <SavedSpecsPanel
                        specs={savedSpecs}
                        projects={projects}
                        currentSpecId={currentSpecId}
                        expandedProjects={expandedProjects}
                        loadingSpecs={loadingSpecs}
                        onToggleProject={toggleProjectFolder}
                        onLoadSpec={handleLoadSpec}
                        onDeleteSpec={handleDeleteSpec}
                    />
                )}

                {/* Main Panel */}
                <div className="main-panel">
                    <div className="upload-section">
                        <FileUploadCard
                            fileName={fileName}
                            onFileUpload={handleFileUpload}
                            onClear={handleClear}
                            onSave={() => setShowSaveModal(true)}
                            hasSpec={!!spec}
                            currentSpecId={currentSpecId}
                            isUserLoggedIn={!!user}
                        />

                        {error && (
                            <div className="error-message">
                                <AlertTriangle size={16} /> {error}
                            </div>
                        )}

                        {processing && (
                            <div className="processing-message">
                                <Loader size={16} className="spin" /> {processing}
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
                                <Button variant="primary" size="small" onClick={handleAddEndpoint}>
                                    <Plus size={16} /> Añadir Endpoint
                                </Button>
                                {currentSpecId && (
                                    <>
                                        <Button variant="secondary" size="small" onClick={() => setShowSaveModal(true)}>
                                            <Save size={16} /> Guardar Cambios
                                        </Button>
                                        <Button variant="secondary" size="small" onClick={() => setShowVersionHistory(true)}>
                                            <History size={16} /> Historial
                                        </Button>
                                    </>
                                )}
                            </div>

                            <EndpointsList
                                paths={spec.paths || {}}
                                onEditEndpoint={handleEditEndpoint}
                                onDeleteEndpoint={handleDeleteEndpoint}
                            />

                            <OpenApiViewer key={viewerKey} spec={spec} />
                        </div>
                    )}

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

            {/* Save Modal - Using generic Modal component */}
            <Modal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                title={currentSpecId ? 'Actualizar Especificación' : 'Guardar Especificación'}
                size="medium"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => setShowSaveModal(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSaveSpec}
                            loading={saving}
                            disabled={!specName.trim() || !selectedProjectId}
                        >
                            <Save size={16} /> Guardar
                        </Button>
                    </>
                }
            >
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
                    >
                        <option value="">-- Selecciona un proyecto --</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.code} - {project.name}
                            </option>
                        ))}
                    </select>
                </div>
            </Modal>

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
