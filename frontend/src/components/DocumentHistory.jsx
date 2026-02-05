import React, { useState, useEffect } from 'react';
import { documentsAPI } from '../services/api';
import { Clock, RotateCcw, User, Calendar, Loader2 } from 'lucide-react';
import '../styles/DocumentHistory.css'; // We'll create this style file next

const DocumentHistory = ({ documentId, onRestore, onClose }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadVersions();
    }, [documentId]);

    const loadVersions = async () => {
        try {
            setLoading(true);
            const response = await documentsAPI.getVersions(documentId);
            setVersions(response.data);
            setError(null);
        } catch (err) {
            console.error('Error loading versions:', err);
            setError('No se pudo cargar el historial de versiones.');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (version) => {
        if (!window.confirm(`¿Estás seguro de restaurar la versión ${version.version_number}? La versión actual se guardará como una nueva versión en el historial.`)) {
            return;
        }

        try {
            setRestoringId(version.id);
            await documentsAPI.restoreVersion(documentId, version.id);
            if (onRestore) onRestore();
            if (onClose) onClose();
        } catch (err) {
            console.error('Error restoring version:', err);
            alert('Error al restaurar la versión: ' + (err.response?.data?.error || err.message));
        } finally {
            setRestoringId(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="history-loading">
                <Loader2 className="spin" size={24} />
                <p>Cargando historial...</p>
            </div>
        );
    }

    if (error) {
        return <div className="history-error">{error}</div>;
    }

    if (versions.length === 0) {
        return (
            <div className="history-empty">
                <Clock size={48} opacity={0.2} />
                <p>No hay versiones anteriores de este documento.</p>
                <small>Las versiones se crean automáticamente cuando editas el documento.</small>
            </div>
        );
    }

    return (
        <div className="document-history-list">
            {versions.map((version) => (
                <div key={version.id} className="history-item">
                    <div className="history-info">
                        <div className="history-header">
                            <span className="history-version-badge">v{version.version_number}</span>
                            <span className="history-date">
                                <Calendar size={14} /> {formatDate(version.created_at)}
                            </span>
                        </div>
                        <div className="history-meta">
                            <div className="meta-user">
                                <User size={14} /> {version.created_by_username || 'Usuario desconocido'}
                            </div>
                            <div className="meta-title">
                                {version.title}
                            </div>
                        </div>
                    </div>
                    <div className="history-actions">
                        <button
                            className="btn-restore"
                            onClick={() => handleRestore(version)}
                            disabled={restoringId !== null}
                            title="Restaurar esta versión"
                        >
                            {restoringId === version.id ? (
                                <Loader2 size={16} className="spin" />
                            ) : (
                                <RotateCcw size={16} />
                            )}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DocumentHistory;
