import React, { useState, useEffect } from 'react';
import { apiKeysAPI, projectsAPI } from '../services/api';
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

    useEffect(() => {
        loadKeys();
        loadProjects();
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

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
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
        </div>
    );
}

export default ApiKeysPage;
