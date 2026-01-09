import React, { useState, useEffect } from 'react';
import '../styles/EndpointPreview.css';

/**
 * Editable endpoint preview component
 * Allows users to review and edit detected endpoints before generating spec
 */
function EndpointPreview({
    endpoints = [],
    onConfirm,
    onCancel,
    repoName = '',
    filePath = ''
}) {
    const [editedEndpoints, setEditedEndpoints] = useState([]);

    useEffect(() => {
        // Initialize with all endpoints selected
        setEditedEndpoints(
            endpoints.map((ep, index) => ({
                ...ep,
                id: index,
                included: true,
                method: ep.method || 'GET',
                path: ep.path || '/',
                summary: ep.summary || `${ep.method} ${ep.path}`
            }))
        );
    }, [endpoints]);

    const toggleEndpoint = (id) => {
        setEditedEndpoints(prev =>
            prev.map(ep => ep.id === id ? { ...ep, included: !ep.included } : ep)
        );
    };

    const updateEndpoint = (id, field, value) => {
        setEditedEndpoints(prev =>
            prev.map(ep => ep.id === id ? { ...ep, [field]: value } : ep)
        );
    };

    const selectAll = () => {
        setEditedEndpoints(prev => prev.map(ep => ({ ...ep, included: true })));
    };

    const deselectAll = () => {
        setEditedEndpoints(prev => prev.map(ep => ({ ...ep, included: false })));
    };

    const handleConfirm = () => {
        const selected = editedEndpoints.filter(ep => ep.included);
        onConfirm(selected);
    };

    const includedCount = editedEndpoints.filter(ep => ep.included).length;

    const methodColors = {
        GET: '#22c55e',
        POST: '#3b82f6',
        PUT: '#f59e0b',
        PATCH: '#8b5cf6',
        DELETE: '#ef4444'
    };

    return (
        <div className="endpoint-preview-overlay">
            <div className="endpoint-preview-modal">
                <div className="preview-header">
                    <div>
                        <h2>📝 Revisar Endpoints Detectados</h2>
                        <p className="preview-subtitle">
                            {repoName && <span className="repo-name">{repoName}</span>}
                            {filePath && <span className="file-path">{filePath}</span>}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onCancel}>✕</button>
                </div>

                <div className="preview-actions">
                    <button className="btn btn-small" onClick={selectAll}>
                        ✓ Seleccionar todos
                    </button>
                    <button className="btn btn-small btn-secondary" onClick={deselectAll}>
                        ✗ Deseleccionar todos
                    </button>
                    <span className="selection-count">
                        {includedCount} de {editedEndpoints.length} seleccionados
                    </span>
                </div>

                <div className="endpoints-table-container">
                    <table className="endpoints-table">
                        <thead>
                            <tr>
                                <th className="col-check">Incluir</th>
                                <th className="col-method">Método</th>
                                <th className="col-path">Path</th>
                                <th className="col-summary">Descripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editedEndpoints.map(ep => (
                                <tr key={ep.id} className={ep.included ? '' : 'excluded'}>
                                    <td className="col-check">
                                        <input
                                            type="checkbox"
                                            checked={ep.included}
                                            onChange={() => toggleEndpoint(ep.id)}
                                        />
                                    </td>
                                    <td className="col-method">
                                        <select
                                            value={ep.method}
                                            onChange={(e) => updateEndpoint(ep.id, 'method', e.target.value)}
                                            style={{
                                                backgroundColor: methodColors[ep.method] || '#6b7280',
                                                color: 'white'
                                            }}
                                            disabled={!ep.included}
                                        >
                                            <option value="GET">GET</option>
                                            <option value="POST">POST</option>
                                            <option value="PUT">PUT</option>
                                            <option value="PATCH">PATCH</option>
                                            <option value="DELETE">DELETE</option>
                                        </select>
                                    </td>
                                    <td className="col-path">
                                        <input
                                            type="text"
                                            value={ep.path}
                                            onChange={(e) => updateEndpoint(ep.id, 'path', e.target.value)}
                                            disabled={!ep.included}
                                            className="path-input"
                                        />
                                    </td>
                                    <td className="col-summary">
                                        <input
                                            type="text"
                                            value={ep.summary}
                                            onChange={(e) => updateEndpoint(ep.id, 'summary', e.target.value)}
                                            disabled={!ep.included}
                                            placeholder="Descripción del endpoint"
                                            className="summary-input"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {editedEndpoints.length === 0 && (
                        <div className="no-endpoints">
                            <p>No se detectaron endpoints en este archivo</p>
                        </div>
                    )}
                </div>

                <div className="preview-footer">
                    <div className="footer-info">
                        <span className="info-badge">
                            💡 Puedes editar método, path y descripción antes de guardar
                        </span>
                    </div>
                    <div className="footer-actions">
                        <button className="btn btn-secondary" onClick={onCancel}>
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleConfirm}
                            disabled={includedCount === 0}
                        >
                            ✓ Generar Spec ({includedCount} endpoints)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EndpointPreview;
