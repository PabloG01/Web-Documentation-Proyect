import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectsAPI, documentsAPI, apiSpecsAPI, environmentsAPI, statsAPI } from '../services/api';
import { Plus, Folder, FileText, Code, Pencil, Trash2, Check, X, ArrowLeft } from '../components/Icons';
import Pagination from '../components/Pagination';
import '../styles/ProjectsPage.css';
import '../styles/LoadingStates.css';

function ProjectsPage({ embedded = false, onStatsChange }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const environmentId = searchParams.get('environment_id');

  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [apiSpecs, setApiSpecs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagination, setPagination] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load environment details if ID is present
      // Note: Environment details not currently fetched separately
      // as they're included in the project list response

      // Optimized: Use stats endpoint instead of loading all data
      const [projectsRes, statsRes, docsRes, apisRes] = await Promise.all([
        projectsAPI.getAll(currentPage, itemsPerPage, environmentId),
        statsAPI.getStats(),
        documentsAPI.getAll(),
        apiSpecsAPI.getAll()
      ]);

      // Manejar formato de respuesta paginada
      if (projectsRes.data.data) {
        setProjects(projectsRes.data.data);
        setPagination(projectsRes.data.pagination);
      } else {
        setProjects(projectsRes.data);
        setPagination(null);
      }

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

  const getDocumentCount = (projectId) => {
    return documents.filter(doc => doc.project_id === projectId).length;
  };

  const getApiCount = (projectId) => {
    return apiSpecs.filter(spec => spec.project_id && spec.project_id.toString() === projectId.toString()).length;
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
      // Notify parent to update stats
      if (onStatsChange) onStatsChange();
    } catch (err) {
      alert('Error al guardar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (projectId) => {
    try {
      const docCount = getDocumentCount(projectId);

      if (docCount > 0) {
        if (!window.confirm(`Este proyecto tiene ${docCount} documento(s). ¿Deseas eliminarlo de todas formas? Los documentos asociados también se eliminarán.`)) {
          return;
        }
      }

      await projectsAPI.delete(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      setDocuments(documents.filter(d => d.project_id !== projectId));
      // Notify parent to update stats
      if (onStatsChange) onStatsChange();
    } catch (err) {
      alert('Error al eliminar: ' + (err.response?.data?.error || err.message));
    }
  };

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
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
        <button className="btn btn-primary" onClick={() => navigate(environmentId ? `/crear?environment_id=${environmentId}` : '/crear')}>
          <Plus size={18} /> Nuevo Proyecto
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Cargando proyectos...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Folder size={48} /></div>
          <h3>No tienes proyectos aún</h3>
          <p>Crea tu primer proyecto para organizar la documentación</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
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
                      <span className="project-code-badge" style={{ backgroundColor: project.color }}>
                        {project.code}
                      </span>
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
                      onClick={() => handleDelete(project.id)}
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
    </div>
  );
}

export default ProjectsPage;
