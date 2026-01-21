import React from 'react';
import '../styles/CreationTypeSelector.css';

function CreationTypeSelector({ onSelect }) {
    const options = [
        {
            type: 'environment',
            icon: '🌐',
            title: 'Crear Entorno',
            description: 'Agrupa múltiples proyectos bajo un mismo cliente o área',
            color: '#ec4899'
        },
        {
            type: 'project',
            icon: '📁',
            title: 'Crear Proyecto',
            description: 'Crea un nuevo proyecto para organizar tus documentos',
            color: '#6366f1'
        },
        {
            type: 'document',
            icon: '📄',
            title: 'Crear Documento',
            description: 'Crea documentación para un proyecto existente',
            color: '#10b981'
        }
    ];

    return (
        <div className="creation-type-selector">
            <div className="creation-options-grid">
                {options.map(option => (
                    <div
                        key={option.type}
                        className="creation-option-card"
                        onClick={() => onSelect(option.type)}
                        style={{ '--accent-color': option.color }}
                    >
                        <div className="option-icon">{option.icon}</div>
                        <h3>{option.title}</h3>
                        <p>{option.description}</p>
                        <div className="option-arrow">→</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CreationTypeSelector;
