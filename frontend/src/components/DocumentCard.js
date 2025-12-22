import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/DocumentCard.css';

function DocumentCard({ document }) {
  const [projectCode, setProjectCode] = useState(null);
  const [projectColor, setProjectColor] = useState('#64748b');

  useEffect(() => {
    if (document.projectId) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const project = projects.find(p => p.id === document.projectId);
      if (project) {
        setProjectCode(project.code);
        setProjectColor(project.color);
      }
    }
  }, [document.projectId]);

  const icons = {
    api: '🔌',
    usuario: '👤',
    tecnica: '⚙️',
    procesos: '📊',
    proyecto: '📋',
    requisitos: '✅'
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  return (
    <div className="document-card">
      <div className="card-header">
        <span className="card-icon">{icons[document.type] || '📄'}</span>
        <div className="card-badges">
          {projectCode && (
            <span className="project-badge" style={{ backgroundColor: projectColor }}>
              {projectCode}
            </span>
          )}
          <span className="card-version">{document.version}</span>
        </div>
      </div>
      
      <h3 className="card-title">{document.title}</h3>
      <p className="card-type">{document.typeName}</p>
      <p className="card-description">{document.description}</p>
      
      <div className="card-meta">
        <span className="meta-author">👤 {document.author}</span>
        <span className="meta-date">📅 {formatDate(document.createdAt)}</span>
      </div>

      <div className="card-actions">
        <Link to={`/documento/${document.id}`} className="btn btn-small">
          Ver
        </Link>
        <Link to={`/documento/${document.id}?edit=true`} className="btn btn-small btn-secondary">
          Editar
        </Link>
      </div>
    </div>
  );
}

export default DocumentCard;
