import React, { useState, useEffect } from 'react';
import { apiSpecsAPI } from '../services/api';
import '../styles/VersionHistory.css';

function VersionHistory({ specId, onRestore, onClose }) {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState(null);
    const [previewVersion, setPreviewVersion] = useState(null);
    const [previewContent, setPreviewContent] = useState(null);

    useEffect(() => {
        loadVersions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [specId]);

    const loadVersions = async () => {
        try {
            setLoading(true);
            const res = await apiSpecsAPI.getVersions(specId);
            setVersions(res.data);
        } catch (err) {
            console.error('Error loading versions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async (version) => {
        try {
            const res = await apiSpecsAPI.getVersion(specId, version.id);
            setPreviewVersion(version);
            setPreviewContent(res.data.spec_content);
        } catch (err) {
            alert('Error al cargar versión');
        }
    };

    const handleRestore = async (version) => {
        if (!window.confirm(`¿Restaurar a la versión ${version.version_number}? La versión actual se guardará automáticamente.`)) {
            return;
        }

        try {
            setRestoring(version.id);
            const res = await apiSpecsAPI.restoreVersion(specId, version.id);
            if (onRestore) {
                onRestore(res.data.spec);
            }
            onClose();
        } catch (err) {
            alert('Error al restaurar: ' + (err.response?.data?.error || err.message));
        } finally {
            setRestoring(null);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="version-history-overlay">
            <div className="version-history-modal">
                <div className="modal-header">
                    <h2>📜 Historial de Versiones</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading">Cargando versiones...</div>
                    ) : versions.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay versiones anteriores.</p>
                            <p className="hint">Las versiones se crean automáticamente al guardar cambios.</p>
                        </div>
                    ) : (
                        <div className="versions-layout">
                            <div className="versions-list">
                                <div className="list-header">
                                    <span>Versiones guardadas ({versions.length}/4)</span>
                                </div>
                                {versions.map((version, idx) => (
                                    <div
                                        key={version.id}
                                        className={`version-item ${previewVersion?.id === version.id ? 'selected' : ''}`}
                                        onClick={() => handlePreview(version)}
                                    >
                                        <div className="version-main">
                                            <span className="version-number">v{version.version_number}</span>
                                            {idx === 0 && <span className="latest-badge">más reciente</span>}
                                        </div>
                                        <div className="version-date">{formatDate(version.created_at)}</div>
                                        <div className="version-summary">{version.change_summary}</div>
                                        <button
                                            className="btn btn-small btn-restore"
                                            onClick={(e) => { e.stopPropagation(); handleRestore(version); }}
                                            disabled={restoring === version.id}
                                        >
                                            {restoring === version.id ? '...' : '↩️ Restaurar'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="version-preview">
                                {previewContent ? (
                                    <>
                                        <div className="preview-header">
                                            Vista previa: v{previewVersion.version_number}
                                        </div>
                                        <pre className="preview-content">
                                            {JSON.stringify(previewContent, null, 2)}
                                        </pre>
                                    </>
                                ) : (
                                    <div className="preview-placeholder">
                                        Selecciona una versión para ver su contenido
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VersionHistory;
