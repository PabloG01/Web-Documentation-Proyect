import React, { useState } from 'react';
import OpenApiViewer from '../components/OpenApiViewer';
import '../styles/ApiTestPage.css';

function ApiTestPage() {
    const [spec, setSpec] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setError('');

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
        // Reset file input
        document.getElementById('file-input').value = '';
    };

    return (
        <div className="api-test-page">
            <div className="page-header">
                <h1>Visor de API OpenAPI</h1>
                <p>Carga un archivo JSON con la especificación OpenAPI para visualizar y probar la API</p>
            </div>

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

                    {fileName && (
                        <button className="btn btn-secondary" onClick={handleClear}>
                            🗑️ Limpiar
                        </button>
                    )}
                </div>

                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                {spec && !error && (
                    <div className="success-message">
                        ✅ Especificación cargada correctamente
                    </div>
                )}
            </div>

            {spec && (
                <div className="viewer-section">
                    <OpenApiViewer spec={spec} />
                </div>
            )}

            {!spec && !error && (
                <div className="placeholder">
                    <div className="placeholder-icon">🔌</div>
                    <h3>No hay especificación cargada</h3>
                    <p>Sube un archivo JSON con la especificación OpenAPI 3.0 para comenzar</p>
                </div>
            )}
        </div>
    );
}

export default ApiTestPage;
