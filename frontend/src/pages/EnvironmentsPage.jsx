import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { environmentsAPI } from '../services/api';
import { Plus, Layout, Pencil, Trash2, Check, X, Folder } from '../components/Icons';
import '../styles/ProjectsPage.css'; // Reusing styles for consistency
import '../styles/LoadingStates.css';

function EnvironmentsPage({ embedded = false, onNavigate }) {
    const navigate = useNavigate();
    const [environments, setEnvironments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Edit/Create State
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', color: '#10b981' });

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
        setFormData({ name: '', description: '', color: '#10b981' });
        setIsCreating(true);
        setEditingId(null);
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
            } else {
                const res = await environmentsAPI.update(editingId, formData);
                setEnvironments(environments.map(e => e.id === editingId ? res.data : e));
                setEditingId(null);
            }
        } catch (err) {
            alert('Error al guardar: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (id, projectCount) => {
        if (projectCount > 0) {
            alert(`No se puede eliminar un entorno que tiene ${projectCount} proyectos. Elimina o mueve los proyectos primero.`);
            return;
        }
        if (!window.confirm('¿Estás seguro de eliminar este entorno?')) return;

        try {
            await environmentsAPI.delete(id);
            setEnvironments(environments.filter(e => e.id !== id));
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    const colors = [
        '#10b981', '#059669', '#34d399', // Greens
        '#3b82f6', '#2563eb', '#60a5fa', // Blues
        '#f59e0b', '#d97706', '#fbbf24', // Ambers
        '#6366f1', '#8b5cf6', '#ec4899'  // Purples/Pinks
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
                    <button className="btn btn-primary" onClick={handleCreate}>
                        <Plus size={18} /> Nuevo Entorno
                    </button>
                )}
            </div>

            {(isCreating || editingId) && renderForm()}

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
                            <div key={env.id} className="project-item" style={{ borderLeftColor: env.color }}>
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
                                    <button className="btn btn-small btn-secondary" onClick={() => handleDelete(env.id, env.project_count)}>
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

export default EnvironmentsPage;
