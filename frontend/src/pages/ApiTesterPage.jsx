import React, { useState, useEffect } from 'react';
import { FlaskConical, Folder, ChevronDown, ChevronUp, Globe, PenTool, Link, Zap, Loader2, CheckCircle, XCircle, AlertTriangle, Info, Sparkles, Layout, Home, Wrench, Rocket, Edit } from 'lucide-react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import api from '../services/api';
import EndpointEditor from '../components/EndpointEditor';

// VITE_CACHE_BUST_2
import '../styles/ApiTesterPage.css';

// Plugin para hacer el filtro de SwaggerUI case-insensitive de forma segura
const CaseInsensitiveFilterPlugin = () => {
    return {
        fn: {
            opsFilter: (taggedOps, phrase) => {
                const phraseLower = phrase.toLowerCase();

                // taggedOps es un Immutable.Map o OrderedMap
                // Filter preserva items donde el callback retorna true
                return taggedOps.filter((val, key) => {
                    // key es el tag name (string)
                    const tagMatch = key.toLowerCase().includes(phraseLower);
                    if (tagMatch) return true;

                    // val es una lista de operaciones (Immutable List)
                    // Si val no existe o no tiene método some, no podemos buscar dentro
                    if (!val || typeof val.some !== 'function') return false;

                    // Buscar coincidencia en las operaciones individuales
                    return val.some(op => {
                        // Validación defensiva para evitar crashes
                        if (!op || typeof op.getIn !== 'function') return false;

                        const summary = op.getIn(['operation', 'summary']);
                        const path = op.get('path');

                        return (summary && summary.toLowerCase().includes(phraseLower)) ||
                            (path && path.toLowerCase().includes(phraseLower));
                    });
                });
            }
        }
    };
};


function ApiTesterPage({ embedded = false }) {
    const [specs, setSpecs] = useState([]);
    const [selectedSpecId, setSelectedSpecId] = useState('');
    const [selectedSpec, setSelectedSpec] = useState(null);
    const [serverUrl, setServerUrl] = useState('http://localhost:5000');
    const [environment, setEnvironment] = useState('local');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState(null); // null | 'testing' | 'success' | 'cors-error' | 'network-error'
    const [basePath, setBasePath] = useState(''); // Store detected base path
    const [enhancing, setEnhancing] = useState(false); // State for AI enhancement
    const [showEditor, setShowEditor] = useState(false); // Toggle for full editor

    // Better approach: Wrap the handler in useCallback and use it in useEffect with dependencies.
    const handleSpecFieldUpdate = async (specPath, value) => {
        if (!selectedSpec) return;
        if (!Array.isArray(specPath)) {
            console.error('Ruta de especificación inválida recibida:', specPath);
            setError('No se pudo identificar el campo a actualizar.');
            return;
        }

        try {
            const updatedSpecContent = JSON.parse(JSON.stringify(selectedSpec));

            // Traverse and update
            let current = updatedSpecContent;
            for (let i = 0; i < specPath.length - 1; i++) {
                if (!current || typeof current !== 'object') {
                    throw new Error('Ruta del esquema no válida');
                }
                current = current[specPath[i]];
            }

            const fieldKey = specPath[specPath.length - 1];
            const isResponseDescription = specPath.includes('responses');

            // Ensure separator logic (reused from EndpointEditor idea)
            const ensureSeparator = (text) => {
                if (!text || typeof text !== 'string' || !text.trim()) return text;
                const trimmed = text.trim();
                if (trimmed.endsWith('---')) return text;
                const lines = trimmed.split('\n');
                if (lines.length > 0 && lines[lines.length - 1].trim() === '---') return text;
                return `${text}\n\n---`;
            };

            if (fieldKey === 'description' && !isResponseDescription) {
                current[fieldKey] = ensureSeparator(value);
            } else {
                current[fieldKey] = value;
            }

            // Save to backend
            await handleManualSave(updatedSpecContent);

        } catch (err) {
            console.error('Error upgrading field:', err);
            setError('Error al guardar campo: ' + err.message);
        }
    };

    // Use ref to hold the handler so the static listener can call it
    const handlerRef = React.useRef(handleSpecFieldUpdate);
    useEffect(() => {
        handlerRef.current = handleSpecFieldUpdate;
    }, [handleSpecFieldUpdate]); // This depends on selectedSpec due to closure? Yes.

    useEffect(() => {
        const listener = (e) => {
            handlerRef.current(e.detail.specPath, e.detail.value);
        };
        document.addEventListener('save-spec-field', listener);
        return () => document.removeEventListener('save-spec-field', listener);
    }, []);

    // Searchable Select State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDropdownOpen && !event.target.closest('.spec-select-container')) {
                setIsDropdownOpen(false);
            }
            if (isEnvDropdownOpen && !event.target.closest('.env-select-container')) {
                setIsEnvDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen, isEnvDropdownOpen]);

    // Filtered specs based on search
    const filteredSpecs = specs.filter(spec =>
        spec.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Dynamic environment presets
    const getEnvironments = () => {
        const currentHost = window.location.hostname;
        const currentProtocol = window.location.protocol;

        return {
            local: 'http://localhost:5000',
            'same-network': `${currentProtocol}//${currentHost}:5000`,
            'custom': serverUrl
        };
    };

    const environments = getEnvironments();
    const currentHostname = window.location.hostname;

    // Load state from localStorage on mount
    useEffect(() => {
        fetchSpecs();

        const savedSpecId = localStorage.getItem('apiTester_selectedSpecId');
        const savedEnv = localStorage.getItem('apiTester_environment');
        const savedUrl = localStorage.getItem('apiTester_serverUrl');
        const savedBasePath = localStorage.getItem('apiTester_basePath');

        if (savedSpecId) {
            setSelectedSpecId(savedSpecId);
            // Trigger fetch of spec content
            handleSpecChange(savedSpecId);
        }
        if (savedEnv) setEnvironment(savedEnv);
        if (savedUrl) setServerUrl(savedUrl);
        if (savedBasePath) setBasePath(savedBasePath);
    }, []);

    const fetchSpecs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api-specs');
            setSpecs(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching specs:', err);
            setError('Error al cargar las especificaciones');
        } finally {
            setLoading(false);
        }
    };

    // Test connection to server
    const testConnection = async (url) => {
        setConnectionStatus('testing');

        try {
            // Try a simple fetch to detect CORS issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            setConnectionStatus('success');
            return true;
        } catch (err) {
            console.error('Connection test error:', err);

            // Detect CORS error
            if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                setConnectionStatus('cors-error');
                setError('Error de CORS: El servidor no permite peticiones desde este origen. Configura CORS en tu API.');
            } else if (err.name === 'AbortError') {
                setConnectionStatus('network-error');
                setError('Timeout: No se pudo conectar al servidor. Verifica que la URL sea correcta y el servidor esté activo.');
            } else {
                setConnectionStatus('network-error');
                setError(`Error de conexión: ${err.message}`);
            }
            return false;
        }
    };

    const handleSpecChange = async (specId) => {
        setIsDropdownOpen(false); // Close dropdown immediately for better UX
        setSearchTerm(''); // Reset search

        if (!specId) {
            setSelectedSpec(null);
            setSelectedSpecId('');
            setBasePath('');
            localStorage.removeItem('apiTester_selectedSpecId');
            return;
        }

        try {
            setSelectedSpecId(specId);
            localStorage.setItem('apiTester_selectedSpecId', specId); // Save spec ID
            const response = await api.get(`/api-specs/${specId}`);
            const spec = response.data.spec_content;

            // Auto-detect base path from spec
            let detectedBasePath = '';

            // OpenAPI 3.x: Check servers array
            if (spec.servers && spec.servers.length > 0) {
                const firstServer = spec.servers[0].url;
                try {
                    // Check if it's a full URL
                    if (firstServer.startsWith('http')) {
                        const url = new URL(firstServer);
                        if (url.pathname && url.pathname !== '/') {
                            detectedBasePath = url.pathname;
                        }
                    } else if (firstServer.startsWith('/')) {
                        detectedBasePath = firstServer;
                    }
                } catch (e) {
                    console.warn('Error parsing server URL:', e);
                }
            }
            // OpenAPI 2.x (Swagger): Check basePath
            else if (spec.basePath) {
                detectedBasePath = spec.basePath;
            }

            setBasePath(detectedBasePath);
            localStorage.setItem('apiTester_basePath', detectedBasePath); // Save basePath

            // Update server URL to include basePath if detected
            let finalServerUrl = serverUrl;

            if (detectedBasePath && detectedBasePath !== '/') {
                // Clean trailing slash from current base URL
                const baseUrl = serverUrl.replace(/\/$/, '');
                // Ensure detectedBasePath starts with /
                const normalizedPath = detectedBasePath.startsWith('/') ? detectedBasePath : `/${detectedBasePath}`;

                // Only append if not already present to avoid duplication
                if (!baseUrl.endsWith(normalizedPath)) {
                    finalServerUrl = `${baseUrl}${normalizedPath}`;
                    // Only update if environment is NOT custom, or if custom creates a valid update
                    setServerUrl(finalServerUrl);
                    localStorage.setItem('apiTester_serverUrl', finalServerUrl); // Save URL
                }
            }

            // Update the spec with the detected server URL
            const updatedSpec = {
                ...spec,
                servers: [
                    {
                        url: finalServerUrl,
                        description: `${environment.charAt(0).toUpperCase() + environment.slice(1)} server`
                    }
                ]
            };

            setSelectedSpec(updatedSpec);

            // Test connection when spec is loaded
            if (finalServerUrl) {
                await testConnection(finalServerUrl);
            }
        } catch (err) {
            console.error('Error loading spec:', err);
            setError('Error al cargar la especificación. Es posible que haya sido eliminada.');

            // If 404, clear selection to avoid stuck state
            if (err.response?.status === 404) {
                setSelectedSpecId('');
                setSelectedSpec(null);
                localStorage.removeItem('apiTester_selectedSpecId');
            }
        }
    };

    const handleServerUrlChange = (newUrl) => {
        setServerUrl(newUrl);
        localStorage.setItem('apiTester_serverUrl', newUrl); // Save URL
        setConnectionStatus(null);
        setError('');

        // Update the spec if one is loaded
        if (selectedSpec) {
            const updatedSpec = {
                ...selectedSpec,
                servers: [
                    {
                        url: newUrl,
                        description: `${environment.charAt(0).toUpperCase() + environment.slice(1)} server`
                    }
                ]
            };
            setSelectedSpec(updatedSpec);
        }
    };

    const handleEnvironmentChange = (env) => {
        setEnvironment(env);
        localStorage.setItem('apiTester_environment', env); // Save environment
        let newUrl = environments[env];

        // If switching to a preset (not custom), ensure we apply the detected basePath
        if (env !== 'custom' && basePath && basePath !== '/') {
            // Remove trailing slash
            newUrl = newUrl.replace(/\/$/, '');
            // Add basePath
            const normalizedPath = basePath.startsWith('/') ? basePath : `/${basePath}`;
            if (!newUrl.endsWith(normalizedPath)) {
                newUrl = `${newUrl}${normalizedPath}`;
            }
        }

        handleServerUrlChange(newUrl);
    };

    const handleEnhance = async () => {
        if (!selectedSpecId) return;

        try {
            setEnhancing(true);
            const response = await api.post(`/api-specs/${selectedSpecId}/enhance`);

            // Reload spec
            const updatedSpec = response.data.spec;

            // Re-apply base path detection logic (reused from handleSpecChange essentially,
            // but for simplicity we just update the content and let the user re-select or we manually update server url if needed.
            // Actually, we should merge the servers logic again.

            // For now, let's just update the spec content in state
            setSelectedSpec(prev => ({
                ...updatedSpec.spec_content,
                servers: prev.servers // Keep the currently configured servers (with base path)
            }));

            alert('¡Especificación mejorada con éxito usando IA!');
        } catch (err) {
            console.error('Error enhancing spec:', err);
            setError('Error al mejorar la especificación con IA');
        } finally {
            setEnhancing(false);
        }
    };

    const handleTestConnection = async () => {
        if (!serverUrl) {
            setError('Ingresa una URL de servidor primero');
            return;
        }
        await testConnection(serverUrl);
    };

    const handleManualSave = async (updatedSpecContent) => {
        try {
            // Need to get the full spec metadata first to not lose name/project_id
            const response = await api.get(`/api-specs/${selectedSpecId}`);
            const fullSpecMetadata = response.data;

            // Update backend
            await api.put(`/api-specs/${selectedSpecId}`, {
                ...fullSpecMetadata, // Keep project_id, name, etc.
                spec_content: updatedSpecContent
            });

            // Update local state
            setSelectedSpec(prev => ({
                ...updatedSpecContent,
                servers: prev.servers // Preserve servers config
            }));

            // Close editor is handled by the editor component usually, or we can close it here if we want 
            // but the editor component calls onClose itself? 
            // Actually EndpointEditor calls onSave then shows success message. 
            // It doesn't auto close. We can leave it open or close it.
            // Let's reload the spec from backend to be safe and 100% synced?
            // "Updated local state" above is faster.

        } catch (err) {
            console.error('Error saving spec manually:', err);
            setError('Error al guardar los cambios manuales: ' + err.message);
            throw err; // Propagate to Editor component
        }
    };

    return (
        <div className="api-tester-page">
            {!embedded && (
                <div className="api-tester-header">
                    <h1><FlaskConical size={32} className="text-icon" /> API Tester</h1>
                    <p>Prueba tus APIs en tiempo real con especificaciones OpenAPI</p>
                </div>
            )}

            {error && (
                <div className="error-message">
                    <div className="error-message">
                        <AlertTriangle size={20} /> {error}
                    </div>
                </div>
            )}

            <div className="api-tester-config">
                <div className="config-section">
                    <label htmlFor="spec-selector">
                        <Folder size={18} /> Especificación:
                    </label>
                    <div className="custom-select-container spec-select-container">
                        <div
                            className={`custom-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                            onClick={() => !loading && setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span>
                                {selectedSpecId
                                    ? specs.find(s => s.id === parseInt(selectedSpecId))?.name || 'Especificación no encontrada'
                                    : 'Selecciona una especificación...'}
                            </span>
                            <span className="arrow">{isDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                        </div>

                        {isDropdownOpen && (
                            <div className="custom-dropdown">
                                <div className="dropdown-search">
                                    <input
                                        type="text"
                                        placeholder="Buscar API..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <ul className="spec-list">
                                    {filteredSpecs.length > 0 ? (
                                        filteredSpecs.map(spec => (
                                            <li
                                                key={spec.id}
                                                className={`spec-item ${parseInt(selectedSpecId) === spec.id ? 'selected' : ''}`}
                                                onClick={() => handleSpecChange(spec.id)}
                                            >
                                                {spec.name}
                                            </li>
                                        ))
                                    ) : (
                                        <div className="no-results">
                                            No se encontraron resultados
                                        </div>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div className="config-section">
                    <label htmlFor="environment-selector">
                        <Globe size={18} /> Entorno:
                    </label>
                    <div className="custom-select-container env-select-container">
                        <div
                            className={`custom-select-trigger ${isEnvDropdownOpen ? 'open' : ''}`}
                            onClick={() => setIsEnvDropdownOpen(!isEnvDropdownOpen)}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {environment === 'local' && <><Home size={16} /> Local (localhost:5000)</>}
                                {environment === 'same-network' && <><Globe size={20} /> Mismo servidor ({currentHostname}:5000)</>}
                                {environment === 'custom' && <><PenTool size={16} /> Personalizado</>}
                            </span>
                            <span className="arrow">{isEnvDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                        </div>

                        {isEnvDropdownOpen && (
                            <div className="custom-dropdown">
                                <ul className="spec-list">
                                    <li className={`spec-item ${environment === 'local' ? 'selected' : ''}`}
                                        onClick={() => { handleEnvironmentChange('local'); setIsEnvDropdownOpen(false); }}>
                                        <Home size={16} /> Local (localhost:5000)
                                    </li>
                                    <li className={`spec-item ${environment === 'same-network' ? 'selected' : ''}`}
                                        onClick={() => { handleEnvironmentChange('same-network'); setIsEnvDropdownOpen(false); }}>
                                        <Globe size={16} /> Mismo servidor ({currentHostname}:5000)
                                    </li>
                                    <li className={`spec-item ${environment === 'custom' ? 'selected' : ''}`}
                                        onClick={() => { handleEnvironmentChange('custom'); setIsEnvDropdownOpen(false); }}>
                                        <PenTool size={16} /> Personalizado
                                    </li>
                                    <li className={`spec-item ${environment === 'custom' ? 'selected' : ''}`}
                                        onClick={() => { handleEnvironmentChange('custom'); setIsEnvDropdownOpen(false); }}>
                                        <PenTool size={16} /> Personalizado
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div className="config-section">
                    <label htmlFor="server-url">
                        <Link size={18} /> URL del Servidor:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            id="server-url"
                            type="text"
                            value={serverUrl}
                            onChange={(e) => handleServerUrlChange(e.target.value)}
                            placeholder="http://localhost:5000"
                            style={{ flex: 1 }}
                        />
                        <button
                            onClick={handleTestConnection}
                            className="btn btn-big"
                            disabled={!serverUrl || connectionStatus === 'testing'}
                            title="Probar conexión"
                        >
                            {connectionStatus === 'testing' ? <Loader2 size={20} className="spin" /> : <Zap size={20} />}
                        </button>
                    </div>
                    <div className="connection-status-msg">
                        {connectionStatus === 'success' && (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={16} /> Conexión exitosa
                            </span>
                        )}
                        {connectionStatus === 'cors-error' && (
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <XCircle size={16} /> Error de CORS
                            </span>
                        )}
                        {connectionStatus === 'network-error' && (
                            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={16} /> Error de conexión
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {loading && (
                <div className="loading-state">
                    <p>Cargando especificaciones...</p>
                </div>
            )}

            {!loading && !selectedSpec && !error && (
                <div className="empty-state">
                    <div className="empty-state-icon"><Layout size={48} className="text-icon" /></div>
                    <h3>Selecciona una especificación para comenzar</h3>
                    <p>Elige una especificación OpenAPI del selector de arriba para probar sus endpoints.</p>
                </div>
            )}

            {selectedSpec && (
                <div className="swagger-container">
                    <div className="swagger-info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Info size={16} className="text-icon" /> <strong>Tip:</strong> Haz clic en "Try it out" en cualquier endpoint para probarlo en vivo.
                            </p>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-primary btn-small"
                                    onClick={() => setShowEditor(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', padding: '0.45rem 0.9rem' }}
                                >
                                    <Edit size={14} /> Editar documentación
                                </button>
                                {/* <button
                                    className="btn btn-secondary btn-small"
                                    onClick={handleEnhance}
                                    disabled={enhancing}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}
                                >
                                    {enhancing ? <><Loader2 size={14} className="spin" /> Mejorando...</> : <><Sparkles size={14} /> Mejorar con IA</>}
                                </button> */}
                            </div>
                        </div>
                    </div>
                    <SwaggerUI
                        spec={selectedSpec}
                        docExpansion="list"
                        defaultModelsExpandDepth={1}
                        displayRequestDuration={true}
                        filter={true}
                        showExtensions={true}
                        showCommonExtensions={true}
                        tryItOutEnabled={true}
                        plugins={[CaseInsensitiveFilterPlugin]}
                    />
                </div>
            )}

            {showEditor && selectedSpec && (
                <EndpointEditor
                    spec={selectedSpec}
                    specId={selectedSpecId}
                    onClose={() => setShowEditor(false)}
                    onSave={handleManualSave}
                />
            )}

        </div>
    );
}

export default ApiTesterPage;
