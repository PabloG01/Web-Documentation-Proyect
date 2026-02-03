import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { documentsAPI, projectsAPI, apiSpecsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FileText, Globe, Folder, Code, Search, Calendar, User, Eye, Trash2, Inbox } from '../components/Icons';
import DocumentCard from '../components/DocumentCard';
import Pagination from '../components/Pagination';
import '../styles/DocumentsListPage.css';
import '../styles/LoadingStates.css';

import Modal from '../components/Modal';
import { ToastContainer } from '../components/Toast';

function DocumentsListPage({ embedded = false, onStatsChange }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [apiSpecs, setApiSpecs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [filterProject, setFilterProject] = useState(searchParams.get('project') || 'todos');
  const [loading, setLoading] = useState(true);

  // Tab activo: 'mine' o 'all'
  const [viewMode, setViewMode] = useState('mine');
  // Tipo de contenido: 'documents' o 'api-specs'
  const [contentType, setContentType] = useState('documents');

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagination, setPagination] = useState(null);

  // UI State
  const [toasts, setToasts] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, spec: null });

  // Selection State
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [selectedSpecIds, setSelectedSpecIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      let response;

      // Si hay filtro de proyecto, usar la API específica
      if (filterProject && filterProject !== 'todos' && filterProject !== 'sin-proyecto') {
        response = await documentsAPI.getByProject(filterProject, currentPage, itemsPerPage);
      } else if (viewMode === 'mine') {
        // Modo "Mis Documentos" - solo del usuario actual
        response = await documentsAPI.getByUser(currentPage, itemsPerPage);
      } else {
        // Modo "Todos" - todos los documentos
        response = await documentsAPI.getAll(currentPage, itemsPerPage);
      }

      // Manejar formato de respuesta paginada
      if (response.data.data) {
        setDocuments(response.data.data);
        setPagination(response.data.pagination);
      } else {
        setDocuments(response.data);
        setPagination(null);
      }
    } catch (err) {
      console.error('Error al cargar documentos:', err);
      // No toast on load for nicer UX
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [filterProject, viewMode, currentPage, itemsPerPage]);

  const loadApiSpecs = useCallback(async () => {
    try {
      const response = await apiSpecsAPI.getAll();
      setApiSpecs(response.data || []);
    } catch (err) {
      console.error('Error al cargar API specs:', err);
      setApiSpecs([]);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const response = await projectsAPI.getAll(1, 100);
      // Manejar formato de respuesta paginada
      setProjects(response.data.data || response.data);
    } catch (err) {
      console.error('Error al cargar proyectos:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadProjects();
    if (user) {
      loadApiSpecs();
    }
  }, [loadDocuments, loadProjects, loadApiSpecs, user]);

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

  // Cambiar modo de vista
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setCurrentPage(1);
    setFilterProject('todos');
  };

  // Filtrado local (se aplica después de la paginación del servidor)
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'todos' || doc.type === filterType;
    // El filtro de proyecto ya se aplica en el servidor
    return matchesSearch && matchesType;
  });

  // Filtrado de API specs
  const filteredSpecs = apiSpecs.filter(spec => {
    const matchesSearch = spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spec.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === 'todos' ||
      (filterProject === 'sin-proyecto' && !spec.project_id) ||
      spec.project_id?.toString() === filterProject;
    return matchesSearch && matchesProject;
  });

  const documentTypes = [
    { value: 'todos', label: 'Todos' },
    { value: 'api', label: 'API' },
    { value: 'usuario', label: 'Manual de Usuario' },
    { value: 'tecnica', label: 'Técnica' },
    { value: 'procesos', label: 'Procesos' },
    { value: 'proyecto', label: 'Proyecto' },
    { value: 'requisitos', label: 'Requisitos' }
  ];

  // Navegar a API Testing con spec específica
  const handleViewSpec = (specId) => {
    navigate(`/api-test?spec=${specId}`);
  };

  // Eliminar spec
  const handleDeleteSpecClick = (spec) => {
    setDeleteModal({ show: true, spec });
  };

  const handleConfirmDeleteSpec = async () => {
    const { spec } = deleteModal;
    if (!spec) return;

    try {
      await apiSpecsAPI.delete(spec.id);
      loadApiSpecs();
      addToast('API Spec eliminada exitosamente', 'success');
      // Notify parent to update stats
      if (onStatsChange) onStatsChange();
      setDeleteModal({ show: false, spec: null });
      // Remove from selection if it was selected
      setSelectedSpecIds(prev => prev.filter(id => id !== spec.id));
    } catch (err) {
      addToast('Error al eliminar: ' + (err.response?.data?.error || err.message), 'error');
      setDeleteModal({ show: false, spec: null });
    }
  };

  // Bulk Actions Handlers
  const handleSelectAllDocs = (e) => {
    if (e.target.checked) {
      setSelectedDocIds(filteredDocuments.map(d => d.id));
    } else {
      setSelectedDocIds([]);
    }
  };

  const handleSelectDoc = (docId) => {
    setSelectedDocIds(prev => {
      if (prev.includes(docId)) return prev.filter(id => id !== docId);
      return [...prev, docId];
    });
  };

  const handleSelectAllSpecs = (e) => {
    if (e.target.checked) {
      setSelectedSpecIds(filteredSpecs.map(s => s.id));
    } else {
      setSelectedSpecIds([]);
    }
  };

  const handleSelectSpec = (specId) => {
    setSelectedSpecIds(prev => {
      if (prev.includes(specId)) return prev.filter(id => id !== specId);
      return [...prev, specId];
    });
  };

  const handleBulkDeleteDocs = async () => {
    if (selectedDocIds.length === 0) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${selectedDocIds.length} documento(s)?`)) return;

    setIsDeleting(true);
    try {
      await Promise.all(selectedDocIds.map(id => documentsAPI.delete(id)));

      // Cleanup
      loadDocuments();
      setSelectedDocIds([]);
      addToast(`${selectedDocIds.length} documentos eliminados`, 'success');
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error(err);
      addToast('Error al eliminar algunos documentos', 'error');
      loadDocuments();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteSpecs = async () => {
    if (selectedSpecIds.length === 0) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${selectedSpecIds.length} API spec(s)?`)) return;

    setIsDeleting(true);
    try {
      await Promise.all(selectedSpecIds.map(id => apiSpecsAPI.delete(id)));

      // Cleanup
      loadApiSpecs();
      setSelectedSpecIds([]);
      addToast(`${selectedSpecIds.length} specs eliminadas`, 'success');
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error(err);
      addToast('Error al eliminar algunas specs', 'error');
      loadApiSpecs();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="documents-list-page">
      <div className="page-header">
        <h1>Documentos</h1>
        <p>
          {contentType === 'documents'
            ? (pagination
              ? `Total: ${pagination.totalItems} documento(s)`
              : `Total: ${filteredDocuments.length} documento(s)`)
            : `Total: ${filteredSpecs.length} API spec(s)`
          }
        </p>
      </div>

      {/* Tabs de tipo de contenido */}
      <div className="content-tabs">
        <button
          className={`content-tab ${contentType === 'documents' ? 'active' : ''}`}
          onClick={() => setContentType('documents')}
        >
          <FileText size={16} /> Documentos
        </button>
        <button
          className={`content-tab ${contentType === 'api-specs' ? 'active' : ''}`}
          onClick={() => setContentType('api-specs')}
        >
          <Code size={16} /> API Specs (Swagger)
        </button>
      </div>

      {/* Tabs de modo de vista - solo para documentos */}
      {contentType === 'documents' && (
        <div className="view-tabs">
          <button
            className={`view-tab ${viewMode === 'mine' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('mine')}
          >
            <FileText size={14} /> Mis Documentos
          </button>
          <button
            className={`view-tab ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('all')}
          >
            <Globe size={14} /> Todos los Documentos
          </button>
        </div>
      )}

      <div className="filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={contentType === 'documents' ? "Buscar documentos..." : "Buscar API specs..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
          <div className="type-filter" style={{ flex: 1 }}>
            <select
              value={filterProject}
              onChange={(e) => {
                setFilterProject(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%' }}
            >
              <option value="todos">Todos los proyectos</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
              <option value="sin-proyecto">Sin proyecto</option>
            </select>
          </div>

          {contentType === 'documents' && (
            <div className="type-filter" style={{ flex: 1 }}>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: '100%' }}>
                {documentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Bulk Actions Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', minHeight: '30px' }}>
          {/* Select All Checkbox for Docs */}
          {contentType === 'documents' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="selectAllDocs"
                checked={filteredDocuments.length > 0 && selectedDocIds.length === filteredDocuments.length}
                onChange={handleSelectAllDocs}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                disabled={filteredDocuments.length === 0}
              />
              <label htmlFor="selectAllDocs" style={{ cursor: 'pointer', fontSize: '0.9rem', minWidth: 'max-content' }}>Seleccionar Todos</label>
            </div>
          )}
          {/* Select All Checkbox for Specs */}
          {contentType === 'api-specs' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="selectAllSpecs"
                checked={filteredSpecs.length > 0 && selectedSpecIds.length === filteredSpecs.length}
                onChange={handleSelectAllSpecs}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                disabled={filteredSpecs.length === 0}
              />
              <label htmlFor="selectAllSpecs" style={{ cursor: 'pointer', fontSize: '0.9rem', minWidth: 'max-content' }}>Seleccionar Todos</label>
            </div>
          )}

          {/* Bulk Actions Button */}
          {contentType === 'documents' && selectedDocIds.length > 0 && (
            <button className="btn btn-danger btn-small" onClick={handleBulkDeleteDocs} disabled={isDeleting}>
              <Trash2 size={14} /> ({selectedDocIds.length})
            </button>
          )}
          {contentType === 'api-specs' && selectedSpecIds.length > 0 && (
            <button className="btn btn-danger btn-small" onClick={handleBulkDeleteSpecs} disabled={isDeleting}>
              <Trash2 size={14} /> ({selectedSpecIds.length})
            </button>
          )}
        </div>
      </div>

      {loading && contentType === 'documents' ? (
        <div className="loading-skeleton">
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
        </div>
      ) : contentType === 'documents' ? (
        // DOCUMENTOS
        filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Inbox size={48} /></div>
            <h2>No se encontraron documentos</h2>
            <p>
              {viewMode === 'mine'
                ? 'Aún no has creado ningún documento. ¡Crea tu primer documento!'
                : 'Intenta ajustar los filtros o crea un nuevo documento'}
            </p>
          </div>
        ) : (
          <>
            <div className="documents-grid">
              {filteredDocuments.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  currentUserId={user?.id}
                  showAuthor={viewMode === 'all'}
                >
                  <div
                    style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 20, cursor: 'pointer' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => handleSelectDoc(doc.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                    />
                  </div>
                </DocumentCard>
              ))}
            </div>

            {pagination && (
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )
      ) : (
        // API SPECS
        filteredSpecs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Code size={48} /></div>
            <h2>No hay API specs guardadas</h2>
            <p>Ve a "API Testing" para subir y guardar especificaciones OpenAPI</p>
          </div>
        ) : (
          <div className="specs-grid">
            {filteredSpecs.map(spec => (
              <div key={spec.id} className="spec-card" style={{ position: 'relative' }}>
                <div
                  style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 20, cursor: 'pointer' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedSpecIds.includes(spec.id)}
                    onChange={() => handleSelectSpec(spec.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                  />
                </div>
                <div className="spec-card-header">
                  <span className="spec-icon"><Code size={20} /></span>
                  {spec.project_code && (
                    <span className="spec-project-badge">{spec.project_code}</span>
                  )}
                </div>
                <h3 className="spec-card-title">{spec.name}</h3>
                {spec.description && (
                  <p className="spec-card-description">{spec.description}</p>
                )}
                <div className="spec-card-meta">
                  <span><Calendar size={14} /> {new Date(spec.created_at).toLocaleDateString('es-ES')}</span>
                  {spec.creator_username && (
                    <span className="spec-creator"><User size={14} /> {spec.creator_username}</span>
                  )}
                </div>
                <div className="spec-card-actions">
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => handleViewSpec(spec.id)}
                  >
                    <Eye size={14} /> Ver con Swagger
                  </button>
                  {user?.id === spec.user_id && (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleDeleteSpecClick(spec)}
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Modal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ ...deleteModal, show: false })}
        title="Eliminar API Spec"
        size="small"
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteModal({ ...deleteModal, show: false })}
            >
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={handleConfirmDeleteSpec}>
              Sí, eliminar
            </button>
          </>
        }
      >
        <p style={{ textAlign: 'center', margin: '10px 0', fontSize: '1rem' }}>
          ¿Estás seguro de que deseas eliminar la especificación <strong>{deleteModal.spec?.name}</strong>?
        </p>
      </Modal>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default DocumentsListPage;
