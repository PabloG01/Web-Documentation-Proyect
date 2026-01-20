import React from 'react';
import '../styles/DocumentTypeSelector.css';

function DocumentTypeSelector({ onSelect }) {
  const documentTypes = [
    {
      id: 'api',
      name: 'Documentación API',
      description: 'Documenta endpoints, parámetros y respuestas',
      icon: '🔌'
    },
    {
      id: 'usuario',
      name: 'Manual de Usuario',
      description: 'Guía paso a paso para usuarios finales',
      icon: '👤'
    },
    {
      id: 'tecnica',
      name: 'Documentación Técnica',
      description: 'Arquitectura, componentes y flujos técnicos',
      icon: '⚙️'
    },
    {
      id: 'procesos',
      name: 'Procesos de Negocio',
      description: 'Flujos y procesos organizacionales',
      icon: '📊'
    },
    {
      id: 'proyecto',
      name: 'Documentación de Proyecto',
      description: 'Resumen, objetivos y entregables',
      icon: '📋'
    },
    {
      id: 'requisitos',
      name: 'Especificación de Requisitos',
      description: 'Requerimientos funcionales y técnicos',
      icon: '✅'
    }
  ];

  return (
    <div className="selector-container">
      <h2>Selecciona el tipo de documentación</h2>
      <div className="types-grid">
        {documentTypes.map(type => (
          <div
            key={type.id}
            className="type-card"
            onClick={() => onSelect(type)}
          >
            <div className="type-icon">{type.icon}</div>
            <h3>{type.name}</h3>
            <p>{type.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentTypeSelector;
