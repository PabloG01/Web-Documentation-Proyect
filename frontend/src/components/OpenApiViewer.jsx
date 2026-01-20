import React, { useEffect, useRef, useState } from 'react';

function OpenApiViewer({ spec }) {
    const wrapperRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);

    // Cargar scripts de Swagger UI una sola vez
    useEffect(() => {
        const loadScripts = async () => {
            // Ya cargado?
            if (window.SwaggerUIBundle && window.SwaggerUIStandalonePreset) {
                setScriptsLoaded(true);
                return;
            }

            try {
                // Cargar CSS
                if (!document.querySelector('link[href*="swagger-ui.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css';
                    document.head.appendChild(link);
                }

                // Cargar Bundle primero
                await loadScript('https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js');

                // Luego Standalone Preset
                await loadScript('https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js');

                setScriptsLoaded(true);
            } catch (error) {
                console.error('Error loading Swagger scripts:', error);
                setLoadError('Error cargando scripts de Swagger UI');
                setIsLoading(false);
            }
        };

        loadScripts();
    }, []);

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (existing.dataset.loaded === 'true') {
                    resolve();
                    return;
                }
                existing.addEventListener('load', () => {
                    existing.dataset.loaded = 'true';
                    resolve();
                });
                existing.addEventListener('error', reject);
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                script.dataset.loaded = 'true';
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    };

    // Inicializar Swagger cuando los scripts estén listos y haya spec
    useEffect(() => {
        if (!scriptsLoaded || !spec || !wrapperRef.current) {
            return;
        }

        setIsLoading(true);
        setLoadError(null);

        // Crear un nuevo div para Swagger (para evitar conflictos con React)
        const containerId = `swagger-container-${Date.now()}`;
        const container = document.createElement('div');
        container.id = containerId;
        container.style.minHeight = '400px';

        // Limpiar wrapper y agregar nuevo container
        wrapperRef.current.innerHTML = '';
        wrapperRef.current.appendChild(container);

        // Pequeño delay para asegurar que el DOM esté listo
        const timer = setTimeout(() => {
            try {
                if (!window.SwaggerUIBundle) {
                    throw new Error('SwaggerUIBundle no disponible');
                }

                window.SwaggerUIBundle({
                    spec: spec,
                    domNode: container,
                    deepLinking: true,
                    presets: [
                        window.SwaggerUIBundle.presets.apis,
                        window.SwaggerUIStandalonePreset
                    ],
                    layout: 'BaseLayout',
                    defaultModelsExpandDepth: -1
                });

                setIsLoading(false);
            } catch (error) {
                console.error('Error initializing Swagger UI:', error);
                setLoadError(error.message);
                setIsLoading(false);
            }
        }, 200);

        // Cleanup: solo limpiar el timer, no tocar el DOM que Swagger controla
        return () => {
            clearTimeout(timer);
        };
    }, [scriptsLoaded, spec]);

    if (!spec) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No se ha cargado ninguna especificación OpenAPI</p>
                <p style={{ fontSize: '0.9rem', color: '#999' }}>Sube un archivo JSON desde arriba para visualizar la API</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div style={{ padding: '20px', color: '#d32f2f', background: '#ffebee', borderRadius: '8px', margin: '20px' }}>
                <h3>Error al cargar el visor</h3>
                <p>No se pudo inicializar Swagger UI. Por favor, recarga la página.</p>
                <p style={{ fontSize: '0.9em', color: '#666' }}>{loadError}</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}
                >
                    🔄 Recargar Página
                </button>
            </div>
        );
    }

    return (
        <div className="openapi-viewer">
            {isLoading && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                    <p>Cargando visor Swagger...</p>
                </div>
            )}
            <div
                ref={wrapperRef}
                style={{ display: isLoading ? 'none' : 'block' }}
            />
        </div>
    );
}

export default OpenApiViewer;