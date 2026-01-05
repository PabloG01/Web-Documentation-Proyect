import React, { useEffect, useRef } from 'react';

function OpenApiViewer({ spec }) {
    const containerRef = useRef(null);
    const uiRef = useRef(null);

    useEffect(() => {
        if (!spec || !containerRef.current) return;

        const containerId = `swagger-ui-${Date.now()}`;
        containerRef.current.id = containerId;

        const loadSwaggerUI = () => {
            // Verificar si ya está cargado
            if (window.SwaggerUIBundle) {
                initSwagger();
                return;
            }

            // Cargar CSS
            if (!document.querySelector('link[href*="swagger-ui.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css';
                document.head.appendChild(link);
            }

            // Cargar JS
            if (!document.querySelector('script[src*="swagger-ui-bundle"]')) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js';
                script.onload = () => {
                    const bundleScript = document.createElement('script');
                    bundleScript.src = 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js';
                    bundleScript.onload = initSwagger;
                    document.head.appendChild(bundleScript);
                };
                document.head.appendChild(script);
            } else {
                // Scripts ya están cargando, esperar
                const checkReady = setInterval(() => {
                    if (window.SwaggerUIBundle) {
                        clearInterval(checkReady);
                        initSwagger();
                    }
                }, 100);
            }
        };

        const initSwagger = () => {
            if (!window.SwaggerUIBundle || !containerRef.current) return;

            try {
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
            } catch (error) {
                console.error('Error initializing Swagger UI:', error);
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
                      <div style="padding: 20px; color: #d32f2f; background: #ffebee; border-radius: 8px; margin: 20px;">
                        <h3>Error al cargar el visor</h3>
                        <p>No se pudo inicializar Swagger UI. Por favor, recarga la página.</p>
                        <p style="font-size: 0.9em; color: #666;">${error.message}</p>
                      </div>
                    `;
                }
            }
        };

        loadSwaggerUI();

        // Cleanup - el componente se destruirá completamente gracias al key
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

    return (
        <div className="openapi-viewer">
            <div ref={containerRef} style={{ minHeight: '400px' }}></div>
        </div>
    );
}

export default OpenApiViewer;