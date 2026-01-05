import React, { useEffect, useRef, useState } from 'react';

function OpenApiViewer({ spec }) {
    const containerRef = useRef(null);
    const uiRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (!spec || !containerRef.current) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setLoadError(null);

        const containerId = `swagger-ui-${Date.now()}`;
        containerRef.current.id = containerId;

        const loadSwaggerUI = async () => {
            try {
                // Verificar si ya está cargado
                if (window.SwaggerUIBundle) {
                    await initSwagger();
                    return;
                }

                // Cargar CSS primero
                if (!document.querySelector('link[href*="swagger-ui.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css';
                    document.head.appendChild(link);
                }

                // Cargar Bundle primero (es el principal)
                await loadScript('https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js');

                // Luego cargar Standalone Preset
                await loadScript('https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js');

                // Pequeño delay para asegurar que todo esté listo
                await new Promise(resolve => setTimeout(resolve, 100));

                await initSwagger();
            } catch (error) {
                console.error('Error loading Swagger UI:', error);
                setLoadError(error.message);
                setIsLoading(false);
            }
        };

        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                // Verificar si ya existe
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    // Si ya está cargado, verificar si ya tiene el contenido
                    if (window.SwaggerUIBundle && src.includes('bundle')) {
                        resolve();
                        return;
                    }
                    if (window.SwaggerUIStandalonePreset && src.includes('standalone')) {
                        resolve();
                        return;
                    }
                    // Esperar a que cargue
                    existing.addEventListener('load', resolve);
                    existing.addEventListener('error', reject);
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(script);
            });
        };

        const initSwagger = async () => {
            if (!window.SwaggerUIBundle || !containerRef.current) {
                throw new Error('SwaggerUIBundle not available');
            }

            try {
                // Limpiar contenedor antes de inicializar
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }

                uiRef.current = window.SwaggerUIBundle({
                    spec: spec,
                    domNode: containerRef.current,
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
        };

        loadSwaggerUI();

        // Cleanup
        return () => {
            uiRef.current = null;
        };
    }, [spec]);

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
            <div ref={containerRef} style={{ minHeight: '400px', display: isLoading ? 'none' : 'block' }}></div>
        </div>
    );
}

export default OpenApiViewer;