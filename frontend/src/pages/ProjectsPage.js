import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ProjectsPage.css';

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    setProjects(storedProjects);
  };

  const getDocumentCount = (projectId) => {
    const documents = JSON.parse(localStorage.getItem('documents') || '[]');
    return documents.filter(doc => doc.projectId === projectId).length;
  };

  const handleEdit = (project) => {
    setEditingId(project.id);
    setEditForm(project);
  };

  const handleSaveEdit = () => {
    const updatedProjects = projects.map(p => 
      p.id === editingId ? editForm : p
    );
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (projectId) => {
    const docCount = getDocumentCount(projectId);
    
    if (docCount > 0) {
      if (!window.confirm(`Este proyecto tiene ${docCount} documento(s). ¿Deseas eliminarlo de todas formas? Los documentos se quedarán sin proyecto.`)) {
        return;
      }
      
      // Remover projectId de los documentos
      const documents = JSON.parse(localStorage.getItem('documents') || '[]');
      const updatedDocs = documents.map(doc => {
        if (doc.projectId === projectId) {
          const { projectId, ...rest } = doc;
          return rest;
        }
        return doc;
      });
      localStorage.setItem('documents', JSON.stringify(updatedDocs));
    }

    const filteredProjects = projects.filter(p => p.id !== projectId);
    localStorage.setItem('projects', JSON.stringify(filteredProjects));
    setProjects(filteredProjects);
  };

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
  ];

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Proyectos</h1>
          <p>Organiza tus documentos por código de proyecto</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/crear')}>
          ➕ Nuevo Proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h2>No hay proyectos</h2>
          <p>Crea tu primer proyecto al crear un documento</p>
          <button className="btn btn-primary" onClick={() => navigate('/crear')}>
            Crear Documento
          </button>
        </div>
      ) : (
        <div className="projects-list">
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
                        onChange={(e) => setEditForm({...editForm, code: e.target.value.toUpperCase()})}
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
                            onClick={() => setEditForm({...editForm, color})}
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
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="edit-field">
                    <label>Descripción</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      rows="2"
                    />
                  </div>

                  <div className="edit-actions">
                    <button className="btn btn-small btn-primary" onClick={handleSaveEdit}>
                      ✅ Guardar
                    </button>
                    <button className="btn btn-small btn-secondary" onClick={() => setEditingId(null)}>
                      ❌ Cancelar
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
                        📄 {getDocumentCount(project.id)} documento(s)
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
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => handleDelete(project.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
