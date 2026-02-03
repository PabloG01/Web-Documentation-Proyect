import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { environmentsAPI } from '../services/api';
import { Plus, Layout, Pencil, Trash2, Check, X, Folder } from '../components/Icons';
import '../styles/ProjectsPage.css'; // Reusing styles for consistency
import '../styles/LoadingStates.css';

import Modal from '../components/Modal';
import { ToastContainer } from '../components/Toast';

function EnvironmentsPage({ embedded = false, onNavigate }) {
    const navigate = useNavigate();
    const [environments, setEnvironments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Edit/Create State
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', color: '#10b981' });

    // UI State
    const [toasts, setToasts] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ show: false, env: null, projectCount: 0 });

    // Selection State
    const [selectedEnvIds, setSelectedEnvIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toast helper
    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    useEffect(() => {
        loadEnvironments();
    }, []);

    const loadEnvironments = async () => {
        try {
            setLoading(true);
            const output = await environmentsAPI.getAll();
            setEnvironments(output.data);
        } catch (err) {
            console.error('Error loading environments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        navigate('/crear?type=environment');
    };

    const handleEdit = (env) => {
        setFormData({ name: env.name, description: env.description, color: env.color });
        setEditingId(env.id);
        setIsCreating(false);
    };

    const handleSave = async () => {
        try {
            if (isCreating) {
                const res = await environmentsAPI.create(formData);
                setEnvironments([...environments, res.data]);
                setIsCreating(false);
                addToast('Entorno creado exitosamente', 'success');
            } else {
                const res = await environmentsAPI.update(editingId, formData);
                setEnvironments(environments.map(e => e.id === editingId ? res.data : e));
                setEditingId(null);
                addToast('Entorno actualizado exitosamente', 'success');
            }
        } catch (err) {
            addToast('Error al guardar: ' + (err.response?.data?.error || err.message), 'error');
        }
    };

    const handleDeleteClick = (env) => {
        setDeleteModal({ show: true, env, projectCount: env.project_count || 0 });
    };

    const handleConfirmDelete = async () => {
        const { env, projectCount } = deleteModal;
        if (!env) return;

        if (projectCount > 0) {
            addToast(`No se puede eliminar un entorno que tiene ${projectCount} proyectos. Elimina los proyectos primero.`, 'warning');
            setDeleteModal({ show: false, env: null, projectCount: 0 });
            return;
        }

        try {
            await environmentsAPI.delete(env.id);
            setEnvironments(environments.filter(e => e.id !== env.id));
            addToast('Entorno eliminado exitosamente', 'success');
            setDeleteModal({ show: false, env: null, projectCount: 0 });
            // Deselect
            setSelectedEnvIds(prev => prev.filter(id => id !== env.id));
        } catch (err) {
            addToast('Error al eliminar: ' + err.message, 'error');
            setDeleteModal({ show: false, env: null, projectCount: 0 });
        }
    };

    // Bulk Actions
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedEnvIds(environments.map(e => e.id));
        } else {
            setSelectedEnvIds([]);
        }
    };

    const handleSelectEnv = (envId) => {
        setSelectedEnvIds(prev => {
            if (prev.includes(envId)) return prev.filter(id => id !== envId);
            return [...prev, envId];
        });
    };

    const handleBulkDelete = async () => {
        if (selectedEnvIds.length === 0) return;

        // Validation: Check if any selected env has projects
        const envsToDelete = environments.filter(e => selectedEnvIds.includes(e.id));
        const envsWithProjects = envsToDelete.filter(e => Number(e.project_count || 0) > 0);

        if (envsWithProjects.length > 0) {
            addToast(`No se pueden eliminar ${envsWithProjects.length} entorno(s) porque tienen proyectos activos. Elimínalos antes.`, 'warning');
            return;
        }

        if (!window.confirm(`¿Estás seguro de que deseas eliminar ${selectedEnvIds.length} entorno(s)?`)) return;

        setIsDeleting(true);
        try {
            await Promise.all(selectedEnvIds.map(id => environmentsAPI.delete(id)));

            // Update UI
            setEnvironments(prev => prev.filter(e => !selectedEnvIds.includes(e.id)));
            setSelectedEnvIds([]);
            addToast(`${selectedEnvIds.length} entornos eliminados`, 'success');
        } catch (err) {
            console.error(err);
            addToast('Error al eliminar algunos entornos', 'error');
            loadEnvironments();
        } finally {
            setIsDeleting(false);
        }
    };

    const colors = [
        '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
        '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
        '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
        '#EC4899', '#F43F5E', '#71717A', '#64748B', '#000000'
    ];

    const renderForm = () => (
        <div className="project-edit" style={{ marginBottom: '20px' }}>
            <h3>{isCreating ? 'Nuevo Entorno' : 'Editar Entorno'}</h3>
            <div className="edit-row">
                <div className="edit-field">
                    <label>Nombre</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Cliente Coexca"
                    />
                </div>
                <div className="edit-field">
                    <label>Color</label>
                    <div className="color-picker-inline">
                        {colors.map(c => (
                            <div
                                key={c}
                                className={`color-option ${formData.color === c ? 'selected' : ''}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setFormData({ ...formData, color: c })}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className="edit-field">
                <label>Descripción</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows="2"
                />
            </div>
            <div className="edit-actions">
                <button className="btn btn-primary btn-small" onClick={handleSave} disabled={!formData.name}>
                    <Check size={16} /> Guardar
                </button>
                <button className="btn btn-secondary btn-small" onClick={() => { setIsCreating(false); setEditingId(null); }}>
                    <X size={16} /> Cancelar
                </button>
            </div>
        </div>
    );

    return (
        <div className="projects-page">
            <div className="page-header">
                <div>
                    <h1>Entornos</h1>
                    <p>Organiza tus proyectos por clientes o áreas de trabajo</p>
                </div>
                {!isCreating && !editingId && (
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>


                        <button className="btn btn-primary" onClick={handleCreate}>
                            <Plus size={18} /> Nuevo Entorno
                        </button>
                    </div>
                )}
            </div>

            {(isCreating || editingId) && renderForm()}

            {!isCreating && !editingId && (
                <div className="filters" style={{ maxWidth: '1200px', margin: '0 auto 20px auto', padding: '0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minHeight: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                                type="checkbox"
                                id="selectAllEnvs"
                                checked={environments.length > 0 && selectedEnvIds.length === environments.length}
                                onChange={handleSelectAll}
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                disabled={environments.length === 0}
                            />
                            <label htmlFor="selectAllEnvs" style={{ cursor: 'pointer', fontSize: '0.9rem', minWidth: 'max-content' }}>Seleccionar Todos</label>
                        </div>

                        {selectedEnvIds.length > 0 && (
                            <button className="btn btn-danger btn-small" onClick={handleBulkDelete} disabled={isDeleting}>
                                <Trash2 size={14} /> ({selectedEnvIds.length})
                            </button>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Cargando entornos...</p>
                </div>
            ) : environments.length === 0 && !isCreating ? (
                <div className="empty-state">
                    <div className="empty-icon"><Layout size={48} /></div>
                    <h3>No hay entornos creados</h3>
                    <p>Crea un entorno para empezar a organizar tus proyectos</p>
                    <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: '1rem' }}>
                        Crear primer entorno
                    </button>
                </div>
            ) : (
                <div className="projects-grid">
                    {environments.map(env => (
                        env.id !== editingId && (
                            <div key={env.id} className="project-item" style={{ borderLeftColor: env.color, position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedEnvIds.includes(env.id)}
                                        onChange={() => handleSelectEnv(env.id)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </div>
                                <div className="project-info">
                                    <div className="project-main">
                                        <div className="project-details">
                                            <h3>{env.name}</h3>
                                            {env.description && <p>{env.description}</p>}
                                        </div>
                                    </div>
                                    <div className="project-stats">
                                        <span className="stat-badge">
                                            <Folder size={14} /> {env.project_count || 0} proyectos
                                        </span>
                                    </div>
                                </div>
                                <div className="project-actions">
                                    <button
                                        className="btn btn-small"
                                        onClick={() => {
                                            if (Number(env.project_count || 0) === 0) {
                                                navigate(`/crear?type=project&environment_id=${env.id}`);
                                                return;
                                            }
                                            if (embedded && onNavigate) {
                                                onNavigate('projects', env.id);
                                            } else {
                                                navigate(`/projects?environment_id=${env.id}`);
                                            }
                                        }}
                                    >
                                        Ver Proyectos
                                    </button>
                                    <button className="btn btn-small btn-secondary" onClick={() => handleEdit(env)}>
                                        <Pencil size={14} /> Editar
                                    </button>
                                    <button className="btn btn-small btn-secondary" onClick={() => handleDeleteClick(env)}>
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )
            }

            <Modal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ ...deleteModal, show: false })}
                title="Eliminar Entorno"
                size="small"
                actions={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setDeleteModal({ ...deleteModal, show: false })}
                        >
                            Cancelar
                        </button>
                        <button className="btn btn-danger" onClick={handleConfirmDelete}>
                            Sí, eliminar
                        </button>
                    </>
                }
            >
                <div style={{ textAlign: 'center' }}>
                    <p>¿Estás seguro de eliminar el entorno <strong>{deleteModal.env?.name}</strong>?</p>
                    {deleteModal.projectCount > 0 && (
                        <p style={{ color: '#ef4444', marginTop: '10px', fontSize: '0.9rem' }}>
                            ⚠️ Este entorno contiene <strong>{deleteModal.projectCount} proyecto(s)</strong>.
                            Debes eliminar o mover los proyectos antes de poder eliminar el entorno.
                        </p>
                    )}
                </div>
            </Modal>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div >
    );
}

export default EnvironmentsPage;
