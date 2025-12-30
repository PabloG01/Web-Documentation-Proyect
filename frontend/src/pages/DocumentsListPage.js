import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentsAPI, projectsAPI } from '../services/api';
import DocumentCard from '../components/DocumentCard';
import Pagination from '../components/Pagination';
import '../styles/DocumentsListPage.css';
import '../styles/LoadingStates.css';

function DocumentsListPage() {
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [filterProject, setFilterProject] = useState(searchParams.get('project') || 'todos');
  const [loading, setLoading] = useState(true);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    loadDocuments();
    loadProjects();
  }, [currentPage, itemsPerPage, filterProject]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      let response;
      
      // Si hay filtro de proyecto, usar la API específica
      if (filterProject && filterProject !== 'todos' && filterProject !== 'sin-proyecto') {
        response = await documentsAPI.getByProject(filterProject, currentPage, itemsPerPage);
      } else {
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


  // Filtrado local (se aplica después de la paginación del servidor)
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'todos' || doc.type === filterType;
    // El filtro de proyecto ya se aplica en el servidor
    return matchesSearch && matchesType;
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

  // (Agrupación por proyecto disponible si se requiere)

  return (
    <div className="documents-list-page">
      <div className="page-header">
        <h1>Mis Documentos</h1>
        <p>
          {pagination 
            ? `Total: ${pagination.totalItems} documento(s)` 
            : `Total: ${filteredDocuments.length} documento(s)`
          }
        </p>
      </div>

      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Buscar documentos..."
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
                setCurrentPage(1); // Reiniciar a página 1 cuando cambia el filtro
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

          <div className="type-filter">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-skeleton">
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2>No se encontraron documentos</h2>
          <p>Intenta ajustar los filtros o crea un nuevo documento</p>
        </div>
      ) : (
        <>
          <div className="documents-grid">
            {filteredDocuments.map(doc => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
          
          {/* Componente de paginación */}
          {pagination && (
            <Pagination 
              pagination={pagination} 
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

export default DocumentsListPage;
