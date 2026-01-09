import React, { useState, useEffect, useCallback } from 'react';
import { projectsAPI } from '../services/api';
import '../styles/ProjectSelector.css';
import '../styles/LoadingStates.css';

function ProjectSelector({ selectedProjectId, onSelect, allowCreate = true }) {
  const [projects, setProjects] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({
    code: '',
    name: '',
    description: '',
    color: '#6366f1'
  });

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAll();
      // Handle paginated response format
      const projectsData = response.data.data || response.data;
      setProjects(projectsData);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();

    // Validar que el código no exista
    const codeExists = projects.some(p => p.code.toLowerCase() === newProject.code.toLowerCase());
    if (codeExists) {
      alert('Ya existe un proyecto con ese código');
      return;
    }

    try {
      const projectData = {
        ...newProject,
        code: newProject.code.toUpperCase()
      };

      const response = await projectsAPI.create(projectData);
      setProjects([...projects, response.data]);
      setShowCreateForm(false);
      setNewProject({ code: '', name: '', description: '', color: '#6366f1' });

      if (onSelect) onSelect(response.data.id);
    } catch (err) {
      alert('Error al crear proyecto: ' + (err.response?.data?.error || err.message));
    }
  };

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
  ];

  return (
    <div className="project-selector">
      <div className="selector-header">
        <h3>Selecciona un Proyecto</h3>
        {allowCreate && (
          <button
            className="btn btn-small btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '❌ Cancelar' : '➕ Nuevo Proyecto'}
          </button>
        )}
      </div>

      {showCreateForm && (
        <form className="create-project-form" onSubmit={handleCreateProject}>
          <div className="form-row">
            <div className="form-group">
              <label>Código del Proyecto*</label>
              <input
                type="text"
                value={newProject.code}
                onChange={(e) => setNewProject({ ...newProject, code: e.target.value.toUpperCase() })}
                placeholder="PRY"
                maxLength="10"
                required
              />
              <small>Máx 10 caracteres, sin espacios</small>
            </div>
            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                {colors.map(color => (
                  <div
                    key={color}
                    className={`color-option ${newProject.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewProject({ ...newProject, color })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Nombre del Proyecto*</label>
            <input
              type="text"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="Nombre descriptivo"
              required
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="Descripción opcional del proyecto"
              rows="2"
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Crear Proyecto
          </button>
        </form>
      )}

      {loading ? (
        <div className="loading-skeleton">
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div
              key={project.id}
              className={`project-card ${selectedProjectId === project.id ? 'selected' : ''}`}
              onClick={() => onSelect && onSelect(project.id)}
              style={{ borderLeftColor: project.color }}
            >
              <div className="project-header">
                <span className="project-code" style={{ backgroundColor: project.color }}>
                  {project.code}
                </span>
                <h4>{project.name}</h4>
              </div>
              {project.description && (
                <p className="project-description">{project.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {projects.length === 0 && !showCreateForm && (
        <div className="empty-projects">
          <p>No hay proyectos creados</p>
          {allowCreate && (
            <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
              Crear primer proyecto
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectSelector;
