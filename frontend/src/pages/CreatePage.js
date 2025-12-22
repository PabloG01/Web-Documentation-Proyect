import React, { useState } from 'react';
import DocumentTypeSelector from '../components/DocumentTypeSelector';
import DocumentForm from '../components/DocumentForm';
import ProjectSelector from '../components/ProjectSelector';
import '../styles/CreatePage.css';

function CreatePage() {
  const [step, setStep] = useState(1); // 1: Proyecto, 2: Tipo, 3: Formulario
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
    setStep(2);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(3);
  };

  const handleFormSubmit = (documentData) => {
    const newDocument = {
      id: Date.now().toString(),
      projectId: selectedProjectId,
      ...documentData
    };
    
    // Guardar en localStorage
    const storedDocuments = JSON.parse(localStorage.getItem('documents') || '[]');
    storedDocuments.push(newDocument);
    localStorage.setItem('documents', JSON.stringify(storedDocuments));

    alert('¡Documentación creada exitosamente!');
    setStep(1);
    setSelectedProjectId(null);
    setSelectedType(null);
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
          <DocumentForm documentType={selectedType} onSubmit={handleFormSubmit} />
        </>
      )}
    </div>
  );
}

export default CreatePage;
