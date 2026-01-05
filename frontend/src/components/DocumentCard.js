import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/DocumentCard.css';

function DocumentCard({ document, currentUserId, showAuthor = false }) {
  // Project info now comes from API via JOIN
  const projectCode = document.project_code || null;
  const projectColor = '#6366f1'; // Could be added to API response if needed

  // Verificar si el usuario actual es el propietario
  const isOwner = currentUserId && document.user_id === currentUserId;

  const icons = {
    api: '🔌',
    usuario: '👤',
    tecnica: '⚙️',
    procesos: '📊',
    proyecto: '📋',
    requisitos: '✅'
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
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
        {showAuthor && document.username && (
          <span className="meta-creator">✍️ {document.username}</span>
        )}
        <span className="meta-author">👤 {document.author}</span>
        <span className="meta-date">📅 {formatDate(document.created_at)}</span>
      </div>

      <div className="card-actions">
        <Link to={`/documento/${document.id}`} className="btn btn-small">
          Ver
        </Link>
        {isOwner && (
          <Link to={`/documento/${document.id}?edit=true`} className="btn btn-small btn-secondary">
            Editar
          </Link>
        )}
      </div>
    </div>
  );
}

export default DocumentCard;
