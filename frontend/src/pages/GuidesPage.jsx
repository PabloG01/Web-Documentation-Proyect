import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/GuidesPage.css';
import { Book, FileCode, BookOpen } from 'lucide-react';

function GuidesPage() {
    const navigate = useNavigate();

    const guides = [
        {
            id: 'app-guide',
            title: 'Guía de la Aplicación',
            icon: <Book size={40} className='text-icon' />,
            description: 'Aprende a usar todas las funcionalidades de DocApp: ambientes, proyectos, documentos, APIs y más.',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            path: '/guides/app'
        },
        {
            id: 'openapi-guide',
            title: 'Guía OpenAPI',
            icon: <FileCode size={40} className='text-icon' />,
            description: 'Descubre el estándar OpenAPI y cómo documentar tus APIs de forma profesional con ejemplos prácticos.',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            path: '/guides/openapi'
        }
    ];

    const handleGuideClick = (path) => {
        navigate(path);
    };

    return (
        <div className="guides-page">
            <div className="guides-container">
                <div className="guides-header">
                    <h1><BookOpen size={40} className='text-icon' /> Centro de Guías</h1>
                    <p>Selecciona una guía para comenzar a aprender</p>
                </div>

                <div className="guides-grid">
                    {guides.map((guide) => (
                        <div
                            key={guide.id}
                            className="guide-card"
                            onClick={() => handleGuideClick(guide.path)}
                            style={{ '--card-gradient': guide.color }}
                        >
                            <div className="guide-card-inner">
                                <div className="guide-icon">{guide.icon}</div>
                                <h2 className="guide-title">{guide.title}</h2>
                                <p className="guide-description">{guide.description}</p>
                                <button className="guide-button">
                                    <span>Ver Guía</span>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                            <div className="guide-card-glow"></div>
                        </div>
                    ))}
                </div>

                <div className="guides-footer">
                </div>
            </div>
        </div>
    );
}

export default GuidesPage;
