import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { documentsAPI, projectsAPI, environmentsAPI } from '../services/api';
import CreationTypeSelector from '../components/CreationTypeSelector';
import DocumentTypeSelector from '../components/DocumentTypeSelector';
import DocumentForm from '../components/DocumentForm';
import ProjectSelector from '../components/ProjectSelector';
import MarkdownHelper from '../components/MarkdownHelper';
import '../styles/CreatePage.css';

function CreatePage() {
  // Steps: 0 = Choose type (or forced project), 1 = Project form OR Project selector, 2 = Doc type, 3 = Doc form
  const [step, setStep] = useState(0);
  const [creationType, setCreationType] = useState(null); // 'project' | 'document'
  const [selectedProjectId, setSelectedProjectId] = useState(null);


  const [selectedType, setSelectedType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasProjects, setHasProjects] = useState(null); // null = loading, true/false = loaded
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    code: '',
    name: '',
    description: '',
    color: '#6366f1'
  });
  const [newEnvironment, setNewEnvironment] = useState({
    name: '',
    description: '',
    color: '#10b981'
  });
  const [environments, setEnvironments] = useState([]); // List of available environments
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const environmentId = searchParams.get('environment_id');

  // Check if projects exist on mount
  useEffect(() => {
    checkProjects();

    // Auto-select project creation if environment_id is present
    if (environmentId) {
      setCreationType('project');
      setShowProjectForm(true);
      setStep(1);
    }
  }, [environmentId]);

  const checkProjects = async () => {
    try {
      const [projectsRes, envsRes] = await Promise.all([
        projectsAPI.getAll(),
        environmentsAPI.getAll()
      ]);
      const projectsData = projectsRes.data.data || projectsRes.data;
      setHasProjects(projectsData.length > 0);
      setEnvironments(envsRes.data || []);
    } catch (err) {
      console.error('Error checking initial data:', err);
      setHasProjects(false); // Fallback assumption
    } finally {
      setInitialCheckDone(true);
    }
  };

  const handleCreationTypeSelect = (type) => {
    console.log('Selected creation type:', type);

    // If type is document but no projects exist, redirect to project creation
    if (type === 'document' && !hasProjects) {
      alert('⚠️ Antes de crear un documento, debes crear al menos un proyecto.');
      setCreationType('project');
      setShowProjectForm(true);
      setStep(1);
      return;
    }

    setCreationType(type);
    if (type === 'project') {
      setShowProjectForm(true);
      setStep(1);
    } else if (type === 'environment') {
      setStep(1);
    } else {
      // Document - go to project selector
      setStep(1);
    }
  };

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
    setStep(2);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(3);
  };

  // ... (keeping handleEnvironmentSubmit and handleProjectSubmit as is) ...

  const handleEnvironmentSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const environmentData = {
        ...newEnvironment
      };
      const response = await environmentsAPI.create(environmentData);
      alert('✅ ¡Entorno creado exitosamente!');

      // Navigate to projects with new environment
      // Check if response.data has id (axios response)
      const envId = response.data?.id || response.data?.data?.id || response.data?.environment?.id;
      navigate(`/projects?environment_id=${response.data.id}`);

    } catch (err) {
      console.error('Error al crear entorno:', err);
      alert('❌ Error al crear entorno: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
      setNewEnvironment({ name: '', description: '', color: '#10b981' });
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();

    // Validate environment
    const envId = environmentId || newProject.environment_id;
    if (!envId) {
      alert('❌ Error: Debes seleccionar un entorno para el proyecto.');
      return;
    }

    try {
      setSaving(true);
      const projectData = {
        ...newProject,
        code: newProject.code.toUpperCase(),
        environment_id: envId
      };
      const response = await projectsAPI.create(projectData);
      alert('✅ ¡Proyecto creado exitosamente!');

      // Update hasProjects state
      setHasProjects(true);

      // Ask if user wants to create a document for this project
      const createDoc = window.confirm('¿Deseas crear un documento para este proyecto?');
      if (createDoc) {
        setSelectedProjectId(response.data.id);
        setCreationType('document');
        setStep(2);
      } else {
        // Only reset form and navigate if not creating document
        setNewProject({ code: '', name: '', description: '', color: '#6366f1' });
        navigate(environmentId ? `/projects?environment_id=${environmentId}` : '/proyectos');
      }
    } catch (err) {
      console.error('Error al crear proyecto:', err);
      alert('❌ Error al crear proyecto: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = async (documentData) => {
    if (!selectedProjectId) {
      alert('❌ Error: No se ha seleccionado un proyecto.');
      setStep(1);
      return;
    }

    if (!selectedType) {
      alert('❌ Error: No se ha seleccionado un tipo de documento.');
      setStep(2);
      return;
    }

    try {
      setSaving(true);
      const newDocument = {
        project_id: selectedProjectId,
        type: selectedType,
        ...documentData
      };

      await documentsAPI.create(newDocument);
      alert('✅ ¡Documentación creada exitosamente!');
      navigate('/mis-documentos');
    } catch (err) {
      console.error('Error al crear documento:', err);
      alert('❌ Error al crear documento: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      setSelectedType(null);
    } else if (step === 2) {
      setStep(1);
      setSelectedProjectId(null);
    } else if (step === 1) {
      // Always allow going back to step 0 if we started there
      setStep(0);
      setCreationType(null);
      setShowProjectForm(false);
      // Clean up URL if going back to start
      if (environmentId) {
        navigate('/crear');
      }
    }
  };

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
  ];

  // Still loading initial check
  if (!initialCheckDone) {
    return (
      <div className="create-page">
        <div className="page-header">
          <h1>Crear</h1>
          <p>Cargando...</p>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  const hasEnvironments = environments.length > 0;

  // NO ENVIRONMENTS: Force environment creation first
  if (initialCheckDone && environments.length === 0 && step === 0) {
    return (
      <div className="create-page">
        <div className="page-header">
          <h1>Bienvenido</h1>
          <p>Para comenzar, crea tu primer entorno</p>
        </div>
        <div className="welcome-message">
          <h2>¡Comienza creando un entorno!</h2>
          <p>Los entornos agrupan tus proyectos (ej: Desarrollo, Producción, o por Cliente). Debes crear al menos un entorno antes de crear proyectos.</p>
        </div>
        <div className="project-form-container">
          <form className="create-project-form-page" onSubmit={handleEnvironmentSubmit}>
            <div className="form-group">
              <label>Nombre del Entorno*</label>
              <input
                type="text"
                value={newEnvironment.name}
                onChange={(e) => setNewEnvironment({ ...newEnvironment, name: e.target.value })}
                placeholder="Ej: Cliente Coexca"
                required
              />
            </div>

            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                {['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ec4899'].map(color => (
                  <div
                    key={color}
                    className={`color-option ${newEnvironment.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewEnvironment({ ...newEnvironment, color })}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={newEnvironment.description}
                onChange={(e) => setNewEnvironment({ ...newEnvironment, description: e.target.value })}
                placeholder="Descripción opcional"
                rows="3"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear mi primer entorno'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 0: Choose creation type (Always available if environments exist)
  if (step === 0) {
    return (
      <div className="create-page">
        <div className="page-header">
          <h1>Crear</h1>
          <p>¿Qué deseas crear?</p>
        </div>
        <CreationTypeSelector onSelect={handleCreationTypeSelect} />
      </div>
    );
  }

  // Step 1: Project form OR Project selector
  if (step === 1) {
    // Creating a project
    if (creationType === 'project' && showProjectForm) {
      return (
        <div className="create-page">
          <button className="btn-back" onClick={handleBack}>
            ← Volver
          </button>
          <div className="page-header">
            <h1>Crear Nuevo Proyecto</h1>
            <p>Define los detalles de tu proyecto</p>
          </div>
          <div className="project-form-container">
            <form className="create-project-form-page" onSubmit={handleProjectSubmit}>
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
                <label>Entorno*</label>
                <select
                  value={environmentId || newProject.environment_id || ''}
                  onChange={(e) => setNewProject({ ...newProject, environment_id: e.target.value })}
                  disabled={!!environmentId}
                  required
                  className="form-select"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-primary, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">-- Selecciona un Entorno --</option>
                  {environments.map(env => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
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
                  rows="3"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creando...' : 'Crear Proyecto'}
              </button>
            </form>
          </div>
        </div>
      );
    }



    // Creating an environment
    if (creationType === 'environment') {
      return (
        <div className="create-page">
          <button className="btn-back" onClick={handleBack}>
            ← Volver
          </button>
          <div className="page-header">
            <h1>Crear Nuevo Entorno</h1>
            <p>Agrupa tus proyectos bajo un cliente o área</p>
          </div>
          <div className="project-form-container">
            <form className="create-project-form-page" onSubmit={handleEnvironmentSubmit}>
              <div className="form-group">
                <label>Nombre del Entorno*</label>
                <input
                  type="text"
                  value={newEnvironment.name}
                  onChange={(e) => setNewEnvironment({ ...newEnvironment, name: e.target.value })}
                  placeholder="Ej: Cliente Coexca"
                  required
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ec4899'].map(color => (
                    <div
                      key={color}
                      className={`color-option ${newEnvironment.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewEnvironment({ ...newEnvironment, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={newEnvironment.description}
                  onChange={(e) => setNewEnvironment({ ...newEnvironment, description: e.target.value })}
                  placeholder="Descripción opcional"
                  rows="3"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creando...' : 'Crear Entorno'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    // Creating a document - show project selector
    if (creationType === 'document') {
      return (
        <div className="create-page">
          <button className="btn-back" onClick={handleBack}>
            ← Volver
          </button>
          <div className="page-header">
            <h1>Crear Documento</h1>
            <p>Paso 1: Selecciona el proyecto</p>
          </div>
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onSelect={handleProjectSelect}
            allowCreate={true}
          />
        </div>
      );
    }


  }

  // Step 2: Document type selector
  if (step === 2) {
    return (
      <div className="create-page">
        <button className="btn-back" onClick={handleBack}>
          ← Volver
        </button>
        <div className="page-header">
          <h1>Crear Documento</h1>
          <p>Paso 2: Selecciona el tipo de documentación</p>
        </div>
        <DocumentTypeSelector onSelect={handleTypeSelect} />
      </div>
    );
  }

  // Step 3: Document form
  if (step === 3) {
    return (
      <div className="create-page">
        <button className="btn-back" onClick={handleBack}>
          ← Volver
        </button>
        <DocumentForm
          documentType={selectedType}
          onSubmit={handleFormSubmit}
          saving={saving}
        />
        <MarkdownHelper />
      </div>
    );
  }

  return null;
}

export default CreatePage;
