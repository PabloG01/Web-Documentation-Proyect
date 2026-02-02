import React, { useState } from 'react';
import '../styles/GuideSidebar.css';
import { BookOpen, Server, FileCode, Coffee, Box, Wrench } from 'lucide-react';

function GuideSidebar({ activeSection, onNavigate }) {
    const sidebarRefs = React.useRef({});

    const sections = [
        { id: 'what-is-openapi', title: '¿Qué es OpenAPI?', icon: <BookOpen size={18} /> },
        { id: 'openapi-structure', title: 'Estructura básica', icon: <Box size={18} /> },
        { id: 'nodejs-swagger-jsdoc', title: 'swagger-jsdoc', icon: <Server size={18} /> },
        { id: 'nodejs-examples', title: 'Ejemplos de código', icon: <FileCode size={18} /> },
        { id: 'python-setup', title: 'Configuración Python', icon: <FileCode size={18} /> },
        { id: 'java-springdoc', title: 'Springdoc OpenAPI', icon: <Coffee size={18} /> },
        { id: 'tools-generators', title: 'Generadores', icon: <Wrench size={18} /> }
    ];

    return (
        <nav className="guide-sidebar">
            <div className="sidebar-header">
                <h2><BookOpen size={20} className="text-icon" /> Guía OpenAPI</h2>
            </div>

            <div className="sidebar-content">
                {sections.map(section => (
                    <button
                        key={section.id}
                        ref={el => sidebarRefs.current[section.id] = el}
                        className={`section-header ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => onNavigate(section.id)}
                    >
                        <span className="section-icon">{section.icon}</span>
                        <span className="section-title">{section.title}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}

export default GuideSidebar;
