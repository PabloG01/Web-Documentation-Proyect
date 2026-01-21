import React, { useState, useEffect } from 'react';
import { apiKeysAPI } from '../services/api';
import { Plus, Trash2, Copy, Check } from '../components/Icons';
import '../styles/ProjectsPage.css';
import '../styles/LoadingStates.css';

function ApiKeysPage() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', expiresInDays: '' });
    const [newKey, setNewKey] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        loadKeys();
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

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const response = await apiKeysAPI.create(
                formData.name,
                formData.expiresInDays ? parseInt(formData.expiresInDays) : null
            );
            setNewKey(response.data);
            setFormData({ name: '', expiresInDays: '' });
            setShowCreateForm(false);
            loadKeys();
        } catch (err) {
            console.error('Error creating API key:', err);
            alert('Error creating API key: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm('¿Seguro que quieres revocar esta API Key? Esta acción no se puede deshacer.')) {
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
                        <div className="edit-actions">
                            <button type="submit" className="btn btn-primary btn-small">
                                Generar Key
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setFormData({ name: '', expiresInDays: '' });
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
                                    </div>
                                </div>
                                <div className="project-stats">
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
                            <div className="project-actions">
                                {key.is_active && !isExpired(key.expires_at) && (
                                    <button
                                        className="btn btn-small btn-secondary"
                                        onClick={() => handleRevoke(key.id)}
                                    >
                                        <Trash2 size={14} /> Revocar
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
