import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import OpenApiViewer from '../components/OpenApiViewer';
import { projectsAPI, apiSpecsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import '../styles/ApiTestPage.css';

function ApiTestPage() {
    const { user } = useContext(AuthContext);
    const [searchParams] = useSearchParams();
    const [spec, setSpec] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');

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

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setError('');
        setCurrentSpecId(null);
        setSpecName(file.name.replace('.json', ''));

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

                setSpec(jsonContent);
                setViewerKey(prev => prev + 1); // Forzar recreación del visor
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

        setSaving(true);
        try {
            const specData = {
                project_id: selectedProjectId || null,
                name: specName.trim(),
                description: specDescription.trim(),
                spec_content: spec
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
                        <h3>📋 Specs Guardadas</h3>
                        {loadingSpecs ? (
                            <p className="loading-text">Cargando...</p>
                        ) : savedSpecs.length === 0 ? (
                            <p className="empty-text">No hay specs guardadas</p>
                        ) : (
                            <ul className="saved-specs-list">
                                {savedSpecs.map((savedSpec) => (
                                    <li key={savedSpec.id} className={`saved-spec-item ${currentSpecId === savedSpec.id ? 'active' : ''}`}>
                                        <div className="spec-info" onClick={() => handleLoadSpec(savedSpec)}>
                                            <span className="spec-name">{savedSpec.name}</span>
                                            {savedSpec.project_name && (
                                                <span className="spec-project">{savedSpec.project_code}</span>
                                            )}
                                        </div>
                                        <button
                                            className="btn-delete-spec"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSpec(savedSpec.id); }}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Panel principal */}
                <div className="main-panel">
                    <div className="upload-section">
                        <div className="upload-card">
                            <label htmlFor="file-input" className="upload-label">
                                <div className="upload-icon">📄</div>
                                <div className="upload-text">
                                    {fileName ? fileName : 'Selecciona un archivo JSON'}
                                </div>
                                <div className="upload-hint">
                                    Haz clic para seleccionar o arrastra un archivo aquí
                                </div>
                            </label>
                            <input
                                id="file-input"
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />

                            <div className="upload-actions">
                                {fileName && (
                                    <button className="btn btn-secondary" onClick={handleClear}>
                                        🗑️ Limpiar
                                    </button>
                                )}
                                {spec && user && (
                                    <button className="btn btn-primary" onClick={() => setShowSaveModal(true)}>
                                        💾 {currentSpecId ? 'Actualizar' : 'Guardar'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="error-message">
                                ⚠️ {error}
                            </div>
                        )}

                        {spec && !error && (
                            <div className="success-message">
                                ✅ Especificación cargada correctamente
                                {currentSpecId && <span> (guardada)</span>}
                            </div>
                        )}
                    </div>

                    {spec && (
                        <div className="viewer-section">
                            <OpenApiViewer key={viewerKey} spec={spec} />
                        </div>
                    )}

                    {!spec && !error && (
                        <div className="placeholder">
                            <div className="placeholder-icon">🔌</div>
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
                            <label>Proyecto (opcional)</label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                            >
                                <option value="">Sin proyecto</option>
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
                                disabled={saving || !specName.trim()}
                            >
                                {saving ? '⏳ Guardando...' : '💾 Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ApiTestPage;
