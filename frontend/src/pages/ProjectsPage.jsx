import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectsAPI, documentsAPI, apiSpecsAPI, environmentsAPI, statsAPI } from '../services/api';
import { Plus, Folder, FileText, Code, Pencil, Trash2, Check, X, ArrowLeft, Search } from '../components/Icons';
import Pagination from '../components/Pagination';
import '../styles/ProjectsPage.css';
import '../styles/DocumentsListPage.css'; // Reusing filter styles
import '../styles/LoadingStates.css';

import Modal from '../components/Modal';
import { ToastContainer } from '../components/Toast';

function ProjectsPage({ embedded = false, onStatsChange }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const environmentId = searchParams.get('environment_id');

  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [apiSpecs, setApiSpecs] = useState([]);
  const [environments, setEnvironments] = useState([]); // New state for environments
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // New search term

  // UI State
  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, project: null, docCount: 0 });

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagination, setPagination] = useState(null);

  // Toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Load logic...
      // Optimized: Use stats endpoint instead of loading all data
      const [projectsRes, statsRes, docsRes, apisRes, envsRes] = await Promise.all([
        projectsAPI.getAll(currentPage, itemsPerPage, environmentId),
        statsAPI.getStats(),
        documentsAPI.getAll(),
        apiSpecsAPI.getAll(),
        environmentsAPI.getAll()
      ]);

      // Manejar formato de respuesta paginada
      if (projectsRes.data.data) {
        setProjects(projectsRes.data.data);
        setPagination(projectsRes.data.pagination);
      } else {
        setProjects(projectsRes.data);
        setPagination(null);
      }

      setEnvironments(envsRes.data || []);

      // Helper to extract data array safely
      const getDataArray = (res) => {
        if (!res || !res.data) return [];
        if (Array.isArray(res.data)) return res.data;
        if (res.data.data && Array.isArray(res.data.data)) return res.data.data;
        return [];
      };

      setDocuments(getDataArray(docsRes));
      setApiSpecs(getDataArray(apisRes));
    } catch (err) {
      console.error('Error al cargar datos:', err);
      // No toast on load error to avoid spam
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, environmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejador de cambio de página
  const handlePageChange = (newPage, newItemsPerPage) => {
    if (newItemsPerPage && newItemsPerPage !== itemsPerPage) {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1); // Reiniciar a página 1 cuando cambia el tamaño
    } else {
      setCurrentPage(newPage);
    }
    // Scroll suave hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnvironmentFilterChange = (e) => {
    const envId = e.target.value;
    const newParams = new URLSearchParams(searchParams);

    if (envId) {
      newParams.set('environment_id', envId);
    } else {
      newParams.delete('environment_id');
    }

    setSearchParams(newParams);
    setCurrentPage(1);
  };

  // Local filtering for search and environment fallback
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.code.toLowerCase().includes(searchTerm.toLowerCase());

    // Fallback: verify environment match even if backend filtered (double check)
    const matchesEnv = !environmentId || String(project.environment_id) === String(environmentId);

    return matchesSearch && matchesEnv;
  });

  const getDocumentCount = (projectId) => {
    return documents.filter(doc => doc.project_id === projectId).length;
  };

  const getApiCount = (projectId) => {
    return apiSpecs.filter(spec => spec.project_id && spec.project_id.toString() === projectId.toString()).length;
  };

  const getEnvName = (id) => {
    if (!id) return '';
    const env = environments.find(e => e.id === id);
    return env ? env.name : '';
  };

  const handleEdit = (project) => {
    setEditingId(project.id);
    setEditForm(project);
  };

  const handleSaveEdit = async () => {
    try {
      await projectsAPI.update(editingId, editForm);
      const updatedProjects = projects.map(p =>
        p.id === editingId ? editForm : p
      );
      setProjects(updatedProjects);
      setEditingId(null);
      setEditForm({});
      addToast('Proyecto actualizado exitosamente', 'success');
      // Notify parent to update stats
      if (onStatsChange) onStatsChange();
    } catch (err) {
      addToast('Error al guardar: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleDeleteClick = (project) => {
    const docCount = getDocumentCount(project.id);
    setDeleteModal({ show: true, project, docCount });
  };

  const handleConfirmDelete = async () => {
    const { project } = deleteModal;
    if (!project) return;

    try {
      await projectsAPI.delete(project.id);
      setProjects(projects.filter(p => p.id !== project.id));
      setDocuments(documents.filter(d => d.project_id !== project.id));
      addToast('Proyecto eliminado exitosamente', 'success');
      setDeleteModal({ show: false, project: null, docCount: 0 });
      // Notify parent to update stats
      if (onStatsChange) onStatsChange();
    } catch (err) {
      addToast('Error al eliminar: ' + (err.response?.data?.error || err.message), 'error');
      setDeleteModal({ show: false, project: null, docCount: 0 });
    }
  };

  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#71717A', '#64748B', '#000000'
  ];

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {environmentId && (
              <button className="btn-icon" onClick={() => navigate('/workspace?section=environments')}>
                <ArrowLeft size={20} />
              </button>
            )}
            <h1>{environmentId ? 'Proyectos del Entorno' : 'Gestión de Proyectos'}</h1>
          </div>
          <p>{environmentId ? `Viendo proyectos asociados al entorno ID: ${environmentId}` : 'Organiza tus documentos por código de proyecto'}</p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate(environmentId ? `/crear?environment_id=${environmentId}` : '/crear?type=project')}>
          <Plus size={18} /> Nuevo Proyecto
        </button>
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar proyectos por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="type-filter">
            <select
              value={environmentId || ''}
              onChange={handleEnvironmentFilterChange}
            >
              <option value="">Todos los Entornos</option>
              {environments.map(env => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Cargando proyectos...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Folder size={48} /></div>
          <h3>{searchTerm ? 'No se encontraron proyectos' : 'No tienes proyectos aún'}</h3>
          <p>{searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer proyecto para organizar la documentación'}</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map(project => (
            <div key={project.id} className="project-item" style={{ borderLeftColor: project.color }}>
              {editingId === project.id ? (
                // MODO EDICIÓN
                <div className="project-edit">
                  <div className="edit-row">
                    <div className="edit-field">
                      <label>Código</label>
                      <input
                        type="text"
                        value={editForm.code}
                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                        maxLength="10"
                      />
                    </div>
                    <div className="edit-field">
                      <label>Color</label>
                      <div className="color-picker-inline">
                        {colors.map(color => (
                          <div
                            key={color}
                            className={`color-option ${editForm.color === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditForm({ ...editForm, color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="edit-field">
                    <label>Nombre</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>

                  <div className="edit-field">
                    <label>Descripción</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows="2"
                    />
                  </div>

                  <div className="edit-actions">
                    <button className="btn btn-small btn-primary" onClick={handleSaveEdit}>
                      <Check size={16} /> Guardar
                    </button>
                    <button className="btn btn-small btn-secondary" onClick={() => setEditingId(null)}>
                      <X size={16} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // MODO VISTA
                <>
                  <div className="project-info">
                    <div className="project-main">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="project-code-badge" style={{ backgroundColor: project.color }}>
                          {project.code}
                        </span>
                        {project.environment_id && (
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #e2e8f0'
                          }}>
                            {getEnvName(project.environment_id)}
                          </span>
                        )}
                      </div>
                      <div className="project-details">
                        <h3>{project.name}</h3>
                        {project.description && <p>{project.description}</p>}
                      </div>
                    </div>
                    <div className="project-stats">
                      <span className="stat-badge">
                        <FileText size={14} /> {getDocumentCount(project.id)} documento(s)
                      </span>
                      <span className="stat-badge">
                        <Code size={14} /> {getApiCount(project.id)} API(s)
                      </span>
                    </div>
                  </div>

                  <div className="project-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => navigate(`/mis-documentos?project=${project.id}`)}
                    >
                      Ver Documentos
                    </button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(project)}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleDeleteClick(project)}
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Componente de paginación */}
      {!loading && pagination && (
        <Pagination
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}

      <Modal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ ...deleteModal, show: false })}
        title="Eliminar Proyecto"
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
          <p>¿Estás seguro de eliminar el proyecto <strong>{deleteModal.project?.name}</strong>?</p>
          {deleteModal.docCount > 0 && (
            <p style={{ color: '#ef4444', marginTop: '10px', fontSize: '0.9rem' }}>
              ⚠️ Este proyecto contiene <strong>{deleteModal.docCount} documento(s)</strong> que también serán eliminados permanentemente.
            </p>
          )}
        </div>
      </Modal>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default ProjectsPage;
