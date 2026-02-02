import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { documentsAPI, projectsAPI, environmentsAPI } from '../services/api';
import CreationTypeSelector from '../components/CreationTypeSelector';
import DocumentTypeSelector from '../components/DocumentTypeSelector';
import DocumentForm from '../components/DocumentForm';
import ProjectSelector from '../components/ProjectSelector';
import MarkdownHelper from '../components/MarkdownHelper';
import Modal from '../components/Modal';
import { ToastContainer } from '../components/Toast';
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

  // Toasts State
  const [toasts, setToasts] = useState([]);

  // Modal State
  const [showDocConfirmModal, setShowDocConfirmModal] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState(null);

  // Toast Helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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
  const typeParam = searchParams.get('type');

  // Check if projects exist on mount
  useEffect(() => {
    checkProjects();

    // Auto-select based on URL params
    if (typeParam === 'environment') {
      setCreationType('environment');
      setStep(1);
    } else if (typeParam === 'project' || environmentId) {
      setCreationType('project');
      setShowProjectForm(true);
      setStep(1);
    }
  }, [environmentId, typeParam]);

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
      addToast('Antes de crear un documento, debes crear al menos un proyecto.', 'warning');
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
      addToast('¡Entorno creado exitosamente!', 'success');

      // Navigate to projects with new environment
      // Check if response.data has id (axios response)
      const envId = response.data?.id || response.data?.data?.id || response.data?.environment?.id;

      // Delay navigation slightly to let toast be seen
      setTimeout(() => {
        navigate(`/projects?environment_id=${response.data.id}`);
      }, 1000);

    } catch (err) {
      console.error('Error al crear entorno:', err);
      addToast('Error al crear entorno: ' + (err.response?.data?.error || err.message), 'error');
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
      addToast('Error: Debes seleccionar un entorno para el proyecto.', 'error');
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
      addToast('¡Proyecto creado exitosamente!', 'success');

      // Update hasProjects state
      setHasProjects(true);
      setPendingProjectId(response.data.id);

      // Show confirmation modal
      setShowDocConfirmModal(true);

    } catch (err) {
      console.error('Error al crear proyecto:', err);
      addToast('Error al crear proyecto: ' + (err.response?.data?.error || err.message), 'error');
      setSaving(false);
    }
  };

  // Handle modal responses
  const handleDocConfirm = () => {
    setShowDocConfirmModal(false);
    setSaving(false);

    if (pendingProjectId) {
      setSelectedProjectId(pendingProjectId);
      setCreationType('document');
      setStep(2);
    }
  };

  const handleDocCancel = () => {
    setShowDocConfirmModal(false);
    setSaving(false);

    // Cleanup and navigate away
    setNewProject({ code: '', name: '', description: '', color: '#6366f1' });
    navigate(environmentId ? `/projects?environment_id=${environmentId}` : '/proyectos');
  };

  const handleFormSubmit = async (documentData) => {
    if (!selectedProjectId) {
      addToast('Error: No se ha seleccionado un proyecto.', 'error');
      setStep(1);
      return;
    }

    if (!selectedType) {
      addToast('Error: No se ha seleccionado un tipo de documento.', 'error');
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
      addToast('¡Documentación creada exitosamente!', 'success');

      setTimeout(() => {
        navigate('/mis-documentos');
      }, 1000);

    } catch (err) {
      console.error('Error al crear documento:', err);
      addToast('Error al crear documento: ' + (err.response?.data?.error || err.message), 'error');
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
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#71717A', '#64748B', '#000000'
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
                {colors.map(color => (
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
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div >
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
        <ToastContainer toasts={toasts} removeToast={removeToast} />
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

          <Modal
            isOpen={showDocConfirmModal}
            onClose={handleDocCancel}
            title="¿Crear documento ahora?"
            size="small"
            actions={
              <>
                <button className="btn btn-secondary" onClick={handleDocCancel}>
                  No, ir a proyectos
                </button>
                <button className="btn btn-primary" onClick={handleDocConfirm}>
                  Sí, crear documento
                </button>
              </>
            }
          >
            <p style={{ textAlign: 'center', margin: '10px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>
              Tu proyecto ha sido creado exitosamente. ¿Deseas empezar a crear un documento para este proyecto ahora mismo?
            </p>
          </Modal>

          <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div >
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
                  {colors.map(color => (
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
          <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div >
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
            onSelect={handleProjectSelect}
            allowCreate={true}
          />
          <ToastContainer toasts={toasts} removeToast={removeToast} />
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
        <ToastContainer toasts={toasts} removeToast={removeToast} />
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
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  return null;
}

export default CreatePage;
