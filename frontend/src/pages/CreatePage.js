import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import DocumentTypeSelector from '../components/DocumentTypeSelector';
import DocumentForm from '../components/DocumentForm';
import ProjectSelector from '../components/ProjectSelector';
import MarkdownHelper from '../components/MarkdownHelper';
import '../styles/CreatePage.css';

function CreatePage() {
  const [step, setStep] = useState(1); // 1: Proyecto, 2: Tipo, 3: Formulario
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
    setStep(2);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(3);
  };

  const handleFormSubmit = async (documentData) => {
    // Validación crítica: asegurar que hay un proyecto seleccionado
    if (!selectedProjectId) {
      alert('❌ Error: No se ha seleccionado un proyecto.\n\nPor favor, vuelve al paso 1 y selecciona un proyecto antes de crear la documentación.');
      setStep(1);
      return;
    }

    // Validación adicional: asegurar que hay un tipo seleccionado
    if (!selectedType) {
      alert('❌ Error: No se ha seleccionado un tipo de documento.\n\nPor favor, vuelve al paso 2 y selecciona el tipo de documentación.');
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

      console.log('Creando documento con project_id:', selectedProjectId); // Debug log

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
    }
  };

  return (
    <div className="create-page">
      {step === 1 ? (
        <>
          <div className="page-header">
            <h1>Crear Nueva Documentación</h1>
            <p>Paso 1: Selecciona o crea un proyecto</p>
          </div>
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onSelect={handleProjectSelect}
            allowCreate={true}
          />
        </>
      ) : step === 2 ? (
        <>
          <button className="btn-back" onClick={handleBack}>
            ← Volver
          </button>
          <div className="page-header">
            <h1>Crear Nueva Documentación</h1>
            <p>Paso 2: Selecciona el tipo de documentación</p>
          </div>
          <DocumentTypeSelector onSelect={handleTypeSelect} />
        </>
      ) : (
        <>
          <button className="btn-back" onClick={handleBack}>
            ← Volver
          </button>
          <DocumentForm
            documentType={selectedType}
            onSubmit={handleFormSubmit}
            saving={saving}
          />
        </>
      )}

      {/* Ayuda flotante de Markdown */}
      {step === 3 && <MarkdownHelper />}
    </div>
  );
}

export default CreatePage;
