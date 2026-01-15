import React, { useState, useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import api from '../services/api';
import '../styles/ApiTesterPage.css';

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

    // Dynamic environment presets
    const getEnvironments = () => {
        const currentHost = window.location.hostname;
        const currentProtocol = window.location.protocol;

        return {
            local: 'http://localhost:5000',
            'same-network': `${currentProtocol}//${currentHost}:5000`,
            'custom': serverUrl,
            staging: 'https://staging-api.ejemplo.com',
            production: 'https://api.ejemplo.com'
        };
    };

    const environments = getEnvironments();

    useEffect(() => {
        fetchSpecs();
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
                setError('⚠️ Error de CORS: El servidor no permite peticiones desde este origen. Configura CORS en tu API.');
            } else if (err.name === 'AbortError') {
                setConnectionStatus('network-error');
                setError('⚠️ Timeout: No se pudo conectar al servidor. Verifica que la URL sea correcta y el servidor esté activo.');
            } else {
                setConnectionStatus('network-error');
                setError(`⚠️ Error de conexión: ${err.message}`);
            }
            return false;
        }
    };

    const handleSpecChange = async (specId) => {
        if (!specId) {
            setSelectedSpec(null);
            setSelectedSpecId('');
            setBasePath('');
            return;
        }

        try {
            setSelectedSpecId(specId);
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
            setError('Error al cargar la especificación');
        }
    };

    const handleServerUrlChange = (newUrl) => {
        setServerUrl(newUrl);
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

    const handleTestConnection = async () => {
        if (!serverUrl) {
            setError('⚠️ Ingresa una URL de servidor primero');
            return;
        }
        await testConnection(serverUrl);
    };

    return (
        <div className="api-tester-page">
            {!embedded && (
                <div className="api-tester-header">
                    <h1>🧪 API Tester</h1>
                    <p>Prueba tus APIs en tiempo real con especificaciones OpenAPI</p>
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="api-tester-config">
                <div className="config-section">
                    <label htmlFor="spec-selector">
                        📁 Especificación:
                    </label>
                    <select
                        id="spec-selector"
                        value={selectedSpecId}
                        onChange={(e) => handleSpecChange(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Selecciona una especificación...</option>
                        {specs.map(spec => (
                            <option key={spec.id} value={spec.id}>
                                {spec.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="config-section">
                    <label htmlFor="environment-selector">
                        🌍 Entorno:
                    </label>
                    <select
                        id="environment-selector"
                        value={environment}
                        onChange={(e) => handleEnvironmentChange(e.target.value)}
                    >
                        <option value="local">🏠 Local (localhost:5000)</option>
                        <option value="same-network">🌐 Mismo servidor ({window.location.hostname}:5000)</option>
                        <option value="custom">✏️ Personalizado</option>
                        <option value="staging">🔧 Staging</option>
                        <option value="production">🚀 Production</option>
                    </select>
                </div>

                <div className="config-section">
                    <label htmlFor="server-url">
                        🌐 URL del Servidor:
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
                            className="btn btn-small"
                            disabled={!serverUrl || connectionStatus === 'testing'}
                            title="Probar conexión"
                        >
                            {connectionStatus === 'testing' ? '⏳' : '🔍'}
                        </button>
                    </div>
                    {connectionStatus === 'success' && (
                        <small style={{ color: '#10b981' }}>✅ Conexión exitosa</small>
                    )}
                    {connectionStatus === 'cors-error' && (
                        <small style={{ color: '#ef4444' }}>❌ Error de CORS</small>
                    )}
                    {connectionStatus === 'network-error' && (
                        <small style={{ color: '#f59e0b' }}>⚠️ Error de conexión</small>
                    )}
                </div>
            </div>

            {loading && (
                <div className="loading-state">
                    <p>Cargando especificaciones...</p>
                </div>
            )}

            {!loading && !selectedSpec && !error && (
                <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3>Selecciona una especificación para comenzar</h3>
                    <p>Elige una especificación OpenAPI del selector de arriba para probar sus endpoints.</p>
                </div>
            )}

            {selectedSpec && (
                <div className="swagger-container">
                    <div className="swagger-info">
                        <p>
                            💡 <strong>Tip:</strong> Haz clic en "Try it out" en cualquier endpoint para probarlo en vivo.
                        </p>
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
                    />
                </div>
            )}
        </div>
    );
}

export default ApiTesterPage;
