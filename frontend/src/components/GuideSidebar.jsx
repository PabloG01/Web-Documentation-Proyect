import React, { useState } from 'react';
import '../styles/GuideSidebar.css';
import { BookOpen, Server, FileCode, Coffee, Box, Wrench } from 'lucide-react';

function GuideSidebar({ activeSection, onNavigate }) {
    const [expanded, setExpanded] = useState({
        intro: true,
        nodejs: false,
        python: false,
        java: false,
        tools: false
    });

    const toggleSection = (section) => {
        setExpanded(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const sidebarRefs = React.useRef({});

    // Auto-expand section when active subsection changes AND scroll to view
    React.useEffect(() => {
        if (!activeSection) return;

        const parentSection = sections.find(section =>
            section.subsections.some(sub => sub.id === activeSection)
        );

        if (parentSection && !expanded[parentSection.id]) {
            setExpanded(prev => ({
                ...prev,
                [parentSection.id]: true
            }));
        }

        // Scroll active item into view
        setTimeout(() => {
            const element = sidebarRefs.current[activeSection];
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }, 100);
    }, [activeSection]);

    const sections = [
        {
            id: 'intro',
            title: 'Introducción',
            icon: <BookOpen size={20} className='text-icon' />,
            subsections: [
                { id: 'what-is-openapi', title: '¿Qué es OpenAPI?' },
                { id: 'openapi-structure', title: 'Estructura básica' }
            ]
        },
        {
            id: 'nodejs',
            title: 'Node.js / Express',
            icon: <Server size={20} className='text-icon' />,
            subsections: [
                { id: 'nodejs-swagger-jsdoc', title: 'swagger-jsdoc' },
                { id: 'nodejs-examples', title: 'Ejemplos de código' }
            ]
        },
        {
            id: 'python',
            title: 'Python / FastAPI',
            icon: <FileCode size={20} className='text-icon' />,
            subsections: [
                { id: 'python-setup', title: 'Configuración' }
            ]
        },
        {
            id: 'java',
            title: 'Java / Spring Boot',
            icon: <Coffee size={20} className='text-icon' />,
            subsections: [
                { id: 'java-springdoc', title: 'Springdoc OpenAPI' }
            ]
        },

        {
            id: 'tools',
            title: 'Herramientas',
            icon: <Wrench size={20} className='text-icon' />,
            subsections: [
                { id: 'tools-generators', title: 'Generadores de código' }
            ]
        }
    ];

    return (
        <nav className="guide-sidebar">
            <div className="sidebar-header">
                <h2><BookOpen size={20} className='text-icon' /> Guía OpenAPI</h2>
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
                                        ref={el => sidebarRefs.current[sub.id] = el}
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
