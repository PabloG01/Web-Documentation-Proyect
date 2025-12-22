import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DocumentCard from '../components/DocumentCard';
import '../styles/DocumentsListPage.css';

function DocumentsListPage() {
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [filterProject, setFilterProject] = useState(searchParams.get('project') || 'todos');

  useEffect(() => {
    loadDocuments();
    loadProjects();
  }, []);

  const loadDocuments = () => {
    const storedDocuments = JSON.parse(localStorage.getItem('documents') || '[]');
    setDocuments(storedDocuments);
  };

  const loadProjects = () => {
    const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    setProjects(storedProjects);
  };


  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'todos' || doc.type === filterType;
    const matchesProject = filterProject === 'todos' || doc.projectId === filterProject;
    return matchesSearch && matchesType && matchesProject;
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
        <p>Total: {filteredDocuments.length} documento(s)</p>
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
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
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

      {filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2>No hay documentos</h2>
          <p>Crea tu primer documento para comenzar</p>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocuments.map(doc => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentsListPage;
