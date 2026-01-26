import React, { useState, useEffect, useRef } from 'react';
import { apiKeysAPI, projectsAPI } from '../services/api';
import { io } from 'socket.io-client';
import { Plus, Trash2, Copy, Check } from '../components/Icons';
import '../styles/ProjectsPage.css';
import '../styles/LoadingStates.css';

function ApiKeysPage() {
    const [keys, setKeys] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', projectId: '', expiresInDays: '' });
    const [newKey, setNewKey] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [usageModal, setUsageModal] = useState({ show: false, keyId: null, stats: null, loading: false });

    // Ref for socket to keep connection persistent
    const socketRef = useRef(null);
    // Ref to track usage usageModal.keyId without triggering re-effects
    const openModalIdRef = useRef(null);

    // Update ref when modal changes
    useEffect(() => {
        openModalIdRef.current = usageModal.show ? usageModal.keyId : null;
    }, [usageModal.show, usageModal.keyId]);

    useEffect(() => {
        loadKeys();
        loadProjects();

        // Initialize Socket.IO connection
        // Use the same hostname/protocol as the window, assuming backend is on port 5000 
        // OR allow the browser to determine base if proxied. 
        // Given current config: http://localhost:5000 is common for dev.
        const socketUrl = `http://${window.location.hostname}:5000`;
        socketRef.current = io(socketUrl);

        socketRef.current.on('connect', () => {
            console.log('🔌 Connected to WebSocket usage updates');
        });

        socketRef.current.on('api_key_usage_updated', (data) => {
            // 1. Update the list directly
            setKeys(prevKeys => prevKeys.map(key => {
                if (key.id === data.keyId) {
                    return {
                        ...key,
                        // Update usage count if provided, otherwise keep existing
                        usage_count: data.usageCount !== undefined ? data.usageCount : key.usage_count,
                        last_used_at: data.lastUsedAt
                    };
                }
                return key;
            }));

            // 2. If the modal for this key is open, refresh the stats to show new logs
            if (openModalIdRef.current === data.keyId) {
                // Call API directly to refresh stats
                apiKeysAPI.getUsageStats(data.keyId)
                    .then(res => {
                        setUsageModal(prev => ({ ...prev, stats: res.data }));
                    })
                    .catch(console.error);
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const loadKeys = async () => {
        try {
            setLoading(true);
            const response = await apiKeysAPI.getAll();
            setKeys(response.data);
        } catch (err) {
            console.error('Error loading API keys:', err);
            alert('Error cargando API Keys');
        } finally {
            setLoading(false);
        }
    };

    const loadProjects = async () => {
        try {
            const response = await projectsAPI.getAll();
            setProjects(response.data.data || response.data);
        } catch (err) {
            console.error('Error loading projects:', err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                expiresInDays: formData.expiresInDays ? parseInt(formData.expiresInDays) : null
            };

            // Add projectId only if selected
            if (formData.projectId) {
                payload.projectId = parseInt(formData.projectId);
            }

            const response = await apiKeysAPI.create(
                payload.name,
                payload.expiresInDays,
                payload.projectId
            );
            setNewKey(response.data);
            setFormData({ name: '', projectId: '', expiresInDays: '' });
            setShowCreateForm(false);
            loadKeys();
        } catch (err) {
            console.error('Error creating API key:', err);
            alert('Error creating API key: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm('¿Seguro que quieres revocar (desactivar) esta API Key? Dejará de funcionar inmediatamente pero podrás eliminarla después.')) {
            return;
        }
        try {
            await apiKeysAPI.revoke(id);
            loadKeys();
        } catch (err) {
            console.error('Error revoking key:', err);
            alert('Error revocando API Key');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que quieres ELIMINAR permanentemente esta API Key? Esta acción NO se puede deshacer.')) {
            return;
        }
        try {
            await apiKeysAPI.deletePermanently(id);
            loadKeys();
        } catch (err) {
            console.error('Error deleting key:', err);
            alert('Error eliminando API Key');
        }
    };

    const handleViewUsage = async (id, keyName) => {
        setUsageModal({ show: true, keyId: id, keyName, stats: null, loading: true });
        try {
            const response = await apiKeysAPI.getUsageStats(id);
            setUsageModal(prev => ({ ...prev, stats: response.data, loading: false }));
        } catch (err) {
            console.error('Error loading usage stats:', err);
            setUsageModal(prev => ({ ...prev, loading: false }));
            alert('Error cargando estadísticas de uso');
        }
    };

    const closeUsageModal = () => {
        setUsageModal({ show: false, keyId: null, keyName: null, stats: null, loading: false });
    };

    const copyToClipboard = async (text, id) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure contexts (LAN http)
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback copy failed', err);
                    alert("No se pudo copiar automáticamente. Por favor selecciónalo manualmente.");
                    return;
                } finally {
                    document.body.removeChild(textArea);
                }
            }

            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert("Error al copiar al portapapeles");
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Sin expiración';
        return new Date(dateStr).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const isExpired = (dateStr) => {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    };

    return (
        <div className="projects-page">
            <div className="page-header">
                <div>
                    <h1>API Keys</h1>
                    <p>Genera keys para acceso M2M (Machine-to-Machine)</p>
                </div>
                {!showCreateForm && (
                    <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
                        <Plus size={18} /> Generar Nueva Key
                    </button>
                )}
            </div>

            {/* NEW KEY ALERT */}
            {newKey && (
                <div style={{
                    background: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ color: '#92400e', marginTop: 0 }}>⚠️ API Key Generada</h3>
                    <p style={{ color: '#78350f' }}>
                        <strong>Copia esta key ahora. No se volverá a mostrar.</strong>
                    </p>
                    <div style={{
                        background: '#1f2937',
                        color: '#10b981',
                        padding: '12px',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        wordBreak: 'break-all',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <code>{newKey.key}</code>
                        <button
                            onClick={() => copyToClipboard(newKey.key, 'new')}
                            style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {copiedId === 'new' ? (
                                <><Check size={16} /> Copiado</>
                            ) : (
                                <><Copy size={16} /> Copiar</>
                            )}
                        </button>
                    </div>
                    <button
                        onClick={() => setNewKey(null)}
                        style={{
                            marginTop: '12px',
                            background: '#9ca3af',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Entendido, ya la copié
                    </button>
                </div>
            )}

            {/* CREATE FORM */}
            {showCreateForm && (
                <div className="project-edit" style={{ marginBottom: '20px' }}>
                    <h3>Generar Nueva API Key</h3>
                    <form onSubmit={handleCreate}>
                        <div className="edit-row">
                            <div className="edit-field">
                                <label>Nombre*</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Servidor Producción"
                                    required
                                />
                            </div>
                            <div className="edit-field">
                                <label>Días hasta expiración (opcional)</label>
                                <input
                                    type="number"
                                    value={formData.expiresInDays}
                                    onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                                    placeholder="365"
                                    min="1"
                                />
                                <small>Dejar vacío para sin expiración</small>
                            </div>
                        </div>


                        {/* PROJECT SELECTOR - Enhanced Dropdown */}
                        <div className="edit-row">
                            <div className="edit-field">
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    color: '#1f2937'
                                }}>
                                    🎯 Ámbito de Acceso
                                </label>
                                <select
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        fontSize: '1rem',
                                        borderRadius: '10px',
                                        border: '2px solid #e5e7eb',
                                        background: 'linear-gradient(to bottom, #ffffff, #f9fafb)',
                                        color: '#1f2937',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        fontWeight: '500',
                                        outline: 'none',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#6366f1';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                    }}
                                >
                                    <option value="">
                                        🌐 Acceso Global - Todos los proyectos
                                    </option>
                                    {projects.length > 0 && (
                                        <optgroup label="───────── Proyectos Específicos ─────────">
                                            {projects.map(proj => (
                                                <option key={proj.id} value={proj.id}>
                                                    📁 {proj.code ? `[${proj.code}] ` : ''}{proj.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <small style={{
                                    display: 'block',
                                    marginTop: '8px',
                                    color: '#64748b',
                                    lineHeight: '1.5',
                                    padding: '8px 12px',
                                    background: '#f1f5f9',
                                    borderRadius: '6px',
                                    borderLeft: '3px solid #6366f1'
                                }}>
                                    {!formData.projectId ? (
                                        <>
                                            <strong>🌐 Acceso Global:</strong> Esta API Key podrá acceder a todos tus proyectos, documentos y APIs.
                                        </>
                                    ) : (
                                        <>
                                            <strong>🔒 Acceso Restringido:</strong> Esta API Key solo podrá acceder a los recursos del proyecto seleccionado.
                                        </>
                                    )}
                                </small>
                            </div>
                        </div>
                        <div className="edit-actions">
                            <button type="submit" className="btn btn-primary btn-small">
                                Generar Key
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setFormData({ name: '', projectId: '', expiresInDays: '' });
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* KEYS LIST */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Cargando API Keys...</p>
                </div>
            ) : keys.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🔑</div>
                    <h3>No tienes API Keys</h3>
                    <p>Genera una para acceder desde otras máquinas</p>
                </div>
            ) : (
                <div className="projects-grid">
                    {keys.map((key) => (
                        <div key={key.id} className="project-item" style={{
                            borderLeftColor: isExpired(key.expires_at) ? '#ef4444' : key.is_active ? '#10b981' : '#9ca3af'
                        }}>
                            <div className="project-info">
                                <div className="project-main">
                                    <div className="project-details">
                                        <h3>{key.name}</h3>
                                        <p style={{ fontFamily: 'monospace', fontSize: '0.9em', color: '#64748b' }}>
                                            {key.prefix}_••••••••
                                        </p>
                                        {key.project_name && (
                                            <p style={{ fontSize: '0.85em', color: '#6366f1', margin: '4px 0 0 0' }}>
                                                📁 Proyecto: <strong>{key.project_name}</strong>
                                            </p>
                                        )}
                                        {!key.project_id && (
                                            <p style={{ fontSize: '0.85em', color: '#10b981', margin: '4px 0 0 0' }}>
                                                🌐 Acceso global
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="project-stats" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                    <span className="stat-badge">
                                        📅 Creada: {formatDate(key.created_at)}
                                    </span>
                                    {key.last_used_at && (
                                        <span className="stat-badge">
                                            ⏱️ Última uso: {formatDate(key.last_used_at)}
                                        </span>
                                    )}
                                    {key.usage_count !== undefined && (
                                        <span className="stat-badge" style={{
                                            background: '#e0e7ff',
                                            color: '#4338ca',
                                            cursor: 'pointer'
                                        }}
                                            onClick={() => handleViewUsage(key.id, key.name)}
                                            title="Ver detalles de uso"
                                        >
                                            📊 Usos: {key.usage_count || 0}
                                        </span>
                                    )}
                                    <span className="stat-badge" style={{
                                        background: isExpired(key.expires_at) ? '#fee2e2' :
                                            key.expires_at ? '#fef3c7' : '#d1fae5',
                                        color: isExpired(key.expires_at) ? '#991b1b' :
                                            key.expires_at ? '#92400e' : '#065f46'
                                    }}>
                                        {isExpired(key.expires_at) ? '❌ Expirada' :
                                            key.expires_at ? `⏳ Expira: ${formatDate(key.expires_at)}` :
                                                '♾️ Sin expiración'}
                                    </span>
                                    {!key.is_active && (
                                        <span className="stat-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                                            🚫 Revocada
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="project-actions" style={{ display: 'flex', gap: '8px' }}>
                                {key.is_active && !isExpired(key.expires_at) && (
                                    <button
                                        className="btn btn-small btn-secondary"
                                        onClick={() => handleRevoke(key.id)}
                                        title="Desactivar esta API Key"
                                    >
                                        <Trash2 size={14} /> Revocar
                                    </button>
                                )}

                                {/* Mostrar botón eliminar para keys revocadas o expiradas */}
                                {(!key.is_active || isExpired(key.expires_at)) && (
                                    <button
                                        className="btn btn-small"
                                        onClick={() => handleDelete(key.id)}
                                        title="Eliminar permanentemente esta API Key"
                                        style={{
                                            background: '#dc2626',
                                            color: 'white',
                                            border: 'none'
                                        }}
                                    >
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* USAGE MODAL */}
            {usageModal.show && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}
                    onClick={closeUsageModal}
                >
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>\ud83d\udcca estadísticas de Uso</h2>
                            <button onClick={closeUsageModal} style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                color: '#6b7280'
                            }}>\u00d7</button>
                        </div>

                        <h3 style={{ color: '#6366f1', marginBottom: '16px' }}>{usageModal.keyName}</h3>

                        {usageModal.loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner-large"></div>
                                <p>Cargando estadísticas...</p>
                            </div>
                        ) : usageModal.stats ? (
                            <>
                                <div style={{
                                    background: '#f3f4f6',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    marginBottom: '24px',
                                    textAlign: 'center'
                                }}>
                                    <h1 style={{ fontSize: '3em', margin: 0, color: '#4338ca' }}>
                                        {usageModal.stats.usage_count || 0}
                                    </h1>
                                    <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>Total de usos</p>
                                </div>

                                <h4 style={{ marginBottom: '12px' }}>📝 Últimos 10 accesos</h4>
                                {usageModal.stats.recent_uses && usageModal.stats.recent_uses.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            fontSize: '0.9em'
                                        }}>
                                            <thead>
                                                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                    <th style={{ padding: '12px', textAlign: 'left' }}>Fecha/Hora</th>
                                                    <th style={{ padding: '12px', textAlign: 'left' }}>Método</th>
                                                    <th style={{ padding: '12px', textAlign: 'left' }}>Endpoint</th>
                                                    <th style={{ padding: '12px', textAlign: 'left' }}>IP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usageModal.stats.recent_uses.map((use, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85em' }}>
                                                            {(() => {
                                                                // Asegurar que la fecha se interprete como UTC si viene sin zona
                                                                let dateStr = use.used_at;
                                                                if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
                                                                    dateStr += 'Z';
                                                                }
                                                                return new Date(dateStr).toLocaleString('es-ES');
                                                            })()}
                                                        </td>
                                                        <td style={{ padding: '12px' }}>
                                                            <span style={{
                                                                background: use.method === 'GET' ? '#d1fae5' :
                                                                    use.method === 'POST' ? '#dbeafe' :
                                                                        use.method === 'PUT' ? '#fef3c7' :
                                                                            use.method === 'DELETE' ? '#fee2e2' : '#f3f4f6',
                                                                color: use.method === 'GET' ? '#065f46' :
                                                                    use.method === 'POST' ? '#1e40af' :
                                                                        use.method === 'PUT' ? '#92400e' :
                                                                            use.method === 'DELETE' ? '#991b1b' : '#4b5563',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.8em',
                                                                fontWeight: '600'
                                                            }}>
                                                                {use.method}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85em', color: '#6366f1' }}>
                                                            {use.endpoint}
                                                        </td>
                                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85em', color: '#6b7280' }}>
                                                            {use.ip_address}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                                        No hay registros de uso disponibles
                                    </p>
                                )}
                            </>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#ef4444' }}>Error cargando estadísticas</p>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}

export default ApiKeysPage;
