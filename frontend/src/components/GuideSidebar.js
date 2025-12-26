import React, { useState } from 'react';
import '../styles/GuideSidebar.css';

function GuideSidebar({ activeSection, onNavigate }) {
    const [expanded, setExpanded] = useState({
        intro: true,
        nodejs: false,
        python: false,
        java: false,
        dotnet: false,
        tools: false
    });

    const toggleSection = (section) => {
        setExpanded(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const sections = [
        {
            id: 'intro',
            title: 'Introducción',
            icon: '📖',
            subsections: [
                { id: 'what-is-openapi', title: '¿Qué es OpenAPI?' },
                { id: 'why-use-openapi', title: '¿Por qué usarlo?' },
                { id: 'openapi-structure', title: 'Estructura básica' }
            ]
        },
        {
            id: 'nodejs',
            title: 'Node.js / Express',
            icon: '🟢',
            subsections: [
                { id: 'nodejs-swagger-jsdoc', title: 'swagger-jsdoc' },
                { id: 'nodejs-examples', title: 'Ejemplos de código' },
                { id: 'nodejs-export', title: 'Exportar JSON' }
            ]
        },
        {
            id: 'python',
            title: 'Python / FastAPI',
            icon: '🐍',
            subsections: [
                { id: 'python-setup', title: 'Configuración' },
                { id: 'python-automatic', title: 'Generación automática' },
                { id: 'python-download', title: 'Descargar especificación' }
            ]
        },
        {
            id: 'java',
            title: 'Java / Spring Boot',
            icon: '☕',
            subsections: [
                { id: 'java-springdoc', title: 'Springdoc OpenAPI' },
                { id: 'java-annotations', title: 'Anotaciones' },
                { id: 'java-access', title: 'Acceder a la UI' }
            ]
        },
        {
            id: 'dotnet',
            title: '.NET / ASP.NET Core',
            icon: '🔷',
            subsections: [
                { id: 'dotnet-swashbuckle', title: 'Swashbuckle' },
                { id: 'dotnet-config', title: 'Configuración' },
                { id: 'dotnet-endpoints', title: 'Endpoints' }
            ]
        },
        {
            id: 'tools',
            title: 'Herramientas',
            icon: '🛠️',
            subsections: [
                { id: 'tools-editors', title: 'Editores online' },
                { id: 'tools-validators', title: 'Validadores' },
                { id: 'tools-generators', title: 'Generadores de código' }
            ]
        }
    ];

    return (
        <nav className="guide-sidebar">
            <div className="sidebar-header">
                <h2>📚 Guía OpenAPI</h2>
            </div>

            <div className="sidebar-content">
                {sections.map(section => (
                    <div key={section.id} className="sidebar-section">
                        <button
                            className={`section-header ${expanded[section.id] ? 'expanded' : ''}`}
                            onClick={() => toggleSection(section.id)}
                        >
                            <span className="section-icon">{section.icon}</span>
                            <span className="section-title">{section.title}</span>
                            <span className="expand-icon">{expanded[section.id] ? '▾' : '▸'}</span>
                        </button>

                        {expanded[section.id] && (
                            <div className="subsections">
                                {section.subsections.map(sub => (
                                    <button
                                        key={sub.id}
                                        className={`subsection-link ${activeSection === sub.id ? 'active' : ''}`}
                                        onClick={() => onNavigate(sub.id)}
                                    >
                                        {sub.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </nav>
    );
}

export default GuideSidebar;
