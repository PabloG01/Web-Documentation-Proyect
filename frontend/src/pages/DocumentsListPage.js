import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { documentsAPI, projectsAPI, apiSpecsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import DocumentCard from '../components/DocumentCard';
import Pagination from '../components/Pagination';
import '../styles/DocumentsListPage.css';
import '../styles/LoadingStates.css';

function DocumentsListPage() {
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

  useEffect(() => {
    loadDocuments();
    loadProjects();
    if (user) {
      loadApiSpecs();
    }
  }, [currentPage, itemsPerPage, filterProject, viewMode, user]);

  const loadDocuments = async () => {
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
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadApiSpecs = async () => {
    try {
      const response = await apiSpecsAPI.getAll();
      setApiSpecs(response.data || []);
    } catch (err) {
      console.error('Error al cargar API specs:', err);
      setApiSpecs([]);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll(1, 100);
      // Manejar formato de respuesta paginada
      setProjects(response.data.data || response.data);
    } catch (err) {
      console.error('Error al cargar proyectos:', err);
    }
  };

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
  const handleDeleteSpec = async (specId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta especificación API?')) return;
    try {
      await apiSpecsAPI.delete(specId);
      loadApiSpecs();
    } catch (err) {
      alert('Error al eliminar: ' + (err.response?.data?.error || err.message));
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
          📄 Documentos
        </button>
        <button
          className={`content-tab ${contentType === 'api-specs' ? 'active' : ''}`}
          onClick={() => setContentType('api-specs')}
        >
          🔌 API Specs (Swagger)
        </button>
      </div>

      {/* Tabs de modo de vista - solo para documentos */}
      {contentType === 'documents' && (
        <div className="view-tabs">
          <button
            className={`view-tab ${viewMode === 'mine' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('mine')}
          >
            📄 Mis Documentos
          </button>
          <button
            className={`view-tab ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('all')}
          >
            🌐 Todos los Documentos
          </button>
        </div>
      )}

      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder={contentType === 'documents' ? "🔍 Buscar documentos..." : "🔍 Buscar API specs..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="type-filter">
            <select
              value={filterProject}
              onChange={(e) => {
                setFilterProject(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="todos">📁 Todos los proyectos</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
              <option value="sin-proyecto">Sin proyecto</option>
            </select>
          </div>

          {contentType === 'documents' && (
            <div className="type-filter">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                {documentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
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
            <div className="empty-icon">📭</div>
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
                />
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
            <div className="empty-icon">🔌</div>
            <h2>No hay API specs guardadas</h2>
            <p>Ve a "API Testing" para subir y guardar especificaciones OpenAPI</p>
          </div>
        ) : (
          <div className="specs-grid">
            {filteredSpecs.map(spec => (
              <div key={spec.id} className="spec-card">
                <div className="spec-card-header">
                  <span className="spec-icon">🔌</span>
                  {spec.project_code && (
                    <span className="spec-project-badge">{spec.project_code}</span>
                  )}
                </div>
                <h3 className="spec-card-title">{spec.name}</h3>
                {spec.description && (
                  <p className="spec-card-description">{spec.description}</p>
                )}
                <div className="spec-card-meta">
                  <span>📅 {new Date(spec.created_at).toLocaleDateString('es-ES')}</span>
                  {spec.creator_username && (
                    <span className="spec-creator">👤 {spec.creator_username}</span>
                  )}
                </div>
                <div className="spec-card-actions">
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => handleViewSpec(spec.id)}
                  >
                    🔍 Ver con Swagger
                  </button>
                  {user?.id === spec.user_id && (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleDeleteSpec(spec.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default DocumentsListPage;
