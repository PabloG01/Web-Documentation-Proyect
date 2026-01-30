import React from 'react';
import '../styles/DocumentTypeSelector.css';
import { Server, User, Settings, BarChart2, ClipboardList, CheckSquare } from 'lucide-react';

function DocumentTypeSelector({ onSelect }) {
  const documentTypes = [
    {
      id: 'api',
      name: 'Documentación API',
      description: 'Documenta endpoints, parámetros y respuestas',
      icon: <Server size={32} />
    },
    {
      id: 'usuario',
      name: 'Manual de Usuario',
      description: 'Guía paso a paso para usuarios finales',
      icon: <User size={32} />
    },
    {
      id: 'tecnica',
      name: 'Documentación Técnica',
      description: 'Arquitectura, componentes y flujos técnicos',
      icon: <Settings size={32} />
    },
    {
      id: 'procesos',
      name: 'Procesos de Negocio',
      description: 'Flujos y procesos organizacionales',
      icon: <BarChart2 size={32} />
    },
    {
      id: 'proyecto',
      name: 'Documentación de Proyecto',
      description: 'Resumen, objetivos y entregables',
      icon: <ClipboardList size={32} />
    },
    {
      id: 'requisitos',
      name: 'Especificación de Requisitos',
      description: 'Requerimientos funcionales y técnicos',
      icon: <CheckSquare size={32} />
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
