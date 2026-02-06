import React, { useState, useEffect } from 'react';
import { documentsAPI } from '../services/api';
import { Clock, RotateCcw, User, Calendar, Loader2, FileDiff } from 'lucide-react';
import DiffViewer from './DiffViewer';
import Modal from './Modal';
import '../styles/DocumentHistory.css';

const DocumentHistory = ({ documentId, currentDocument, onRestore, onClose }) => {
    const [historyVersions, setHistoryVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);
    const [error, setError] = useState(null);

    // State for diff modal
    const [showDiffModal, setShowDiffModal] = useState(false);
    const [selectedDiffVersion, setSelectedDiffVersion] = useState(null);
    const [previousVersionContent, setPreviousVersionContent] = useState('');

    useEffect(() => {
        loadVersions();
    }, [documentId]);

    const loadVersions = async () => {
        try {
            setLoading(true);
            const response = await documentsAPI.getVersions(documentId);
            setHistoryVersions(response.data);
            setError(null);
        } catch (err) {
            console.error('Error loading versions:', err);
            setError('No se pudo cargar el historial de versiones.');
        } finally {
            setLoading(false);
        }
    };

    // Combine current document with history
    const allVersions = [
        {
            id: 'current',
            version_number: currentDocument?.version || 'Actual',
            created_at: currentDocument?.updated_at || new Date().toISOString(),
            created_by_username: 'Tú (Actual)',
            title: currentDocument?.title,
            content: currentDocument?.content,
            isCurrent: true
        },
        ...historyVersions
    ];

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

    const handleViewDiff = (index) => {
        const selected = allVersions[index];
        const previous = allVersions[index + 1]; // Compare with the version immediately before it in the list

        setSelectedDiffVersion(selected);
        setPreviousVersionContent(previous ? previous.content : '');
        setShowDiffModal(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Sin fecha';
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

    // Don't show empty state if current doc exists (which it always does)

    return (
        <>
            <div className="document-history-list">
                {allVersions.map((version, index) => (
                    <div key={version.id} className={`history-item ${version.isCurrent ? 'current-version-item' : ''}`}>
                        <div className="history-info">
                            <div className="history-header">
                                <span className={`history-version-badge ${version.isCurrent ? 'current-badge' : ''}`}>
                                    {version.isCurrent ? 'VERSIÓN ACTUAL' : `v${version.version_number}`}
                                </span>
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
                            {/* Only show diff if there is a previous version to compare to */}
                            {allVersions[index + 1] && (
                                <button
                                    className="btn-diff"
                                    onClick={() => handleViewDiff(index)}
                                    title={version.isCurrent ? "Ver cambios sin guardar (vs última versión)" : "Ver cambios respecto a la versión anterior"}
                                >
                                    <FileDiff size={16} />
                                </button>
                            )}

                            {!version.isCurrent && (
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
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Diff Modal */}
            <Modal
                isOpen={showDiffModal}
                onClose={() => setShowDiffModal(false)}
                title={`Cambios en ${selectedDiffVersion?.isCurrent ? 'Versión Actual' : 'versión ' + selectedDiffVersion?.version_number}`}
                size="large"
            >
                <div className="diff-modal-info">
                    <p>
                        Comparando <strong>{selectedDiffVersion?.isCurrent ? 'Versión Actual (Live)' : `Versión ${selectedDiffVersion?.version_number}`}</strong> con
                        {previousVersionContent ? (
                            <span> versión <strong>{allVersions.find(v => v.content === previousVersionContent && v !== selectedDiffVersion)?.version_number || 'anterior'}</strong></span>
                        ) : ' documento vacío (creación)'}.
                    </p>
                    <div className="diff-legend" style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '0.9rem' }}>
                        <span style={{ color: '#166534', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>Verde: Agregado</span>
                        <span style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', textDecoration: 'line-through' }}>Rojo: Eliminado</span>
                    </div>
                </div>

                <div className="diff-modal-content">
                    <DiffViewer
                        oldText={previousVersionContent}
                        newText={selectedDiffVersion?.content}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowDiffModal(false)}>
                        Cerrar
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default DocumentHistory;
