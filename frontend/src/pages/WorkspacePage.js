import React, { useState, useContext, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { projectsAPI, documentsAPI, apiSpecsAPI, reposAPI } from '../services/api';
import { Folder, FileText, Globe, FolderOpen, User, ChevronLeft, ChevronRight } from '../components/Icons';
import '../styles/WorkspacePage.css';

// Import existing page components to reuse
import ProjectsPage from './ProjectsPage';
import DocumentsListPage from './DocumentsListPage';
import ApiTestPage from './ApiTestPage';
import ReposPage from './ReposPage';

function WorkspacePage() {
    const { user } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();

    // Active section from URL or default
    const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'projects');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Stats for sidebar badges
    const [stats, setStats] = useState({
        projects: 0,
        documents: 0,
        apis: 0,
        repos: 0
    });

    // Load stats on mount
    useEffect(() => {
        loadStats();
    }, []);

    // Update URL when section changes
    useEffect(() => {
        setSearchParams({ section: activeSection });
    }, [activeSection, setSearchParams]);

    const loadStats = async () => {
        try {
            const [projectsRes, docsRes, apisRes, reposRes] = await Promise.all([
                projectsAPI.getAll().catch(() => ({ data: [] })),
                documentsAPI.getAll().catch(() => ({ data: [] })),
                apiSpecsAPI.getAll().catch(() => ({ data: [] })),
                reposAPI.getAll().catch(() => ({ data: [] }))
            ]);
            setStats({
                projects: projectsRes.data?.length || 0,
                documents: docsRes.data?.length || 0,
                apis: apisRes.data?.length || 0,
                repos: reposRes.data?.length || 0
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleSectionChange = (section) => {
        setActiveSection(section);
    };

    const sidebarItems = [
        {
            id: 'projects',
            icon: <Folder size={20} />,
            label: 'Proyectos',
            count: stats.projects,
            description: 'Gestiona tus proyectos'
        },
        {
            id: 'documents',
            icon: <FileText size={20} />,
            label: 'Documentos',
            count: stats.documents,
            description: 'Todos tus documentos'
        },
        {
            id: 'apis',
            icon: <Globe size={20} />,
            label: 'APIs',
            count: stats.apis,
            description: 'Specs OpenAPI guardadas'
        },
        {
            id: 'repos',
            icon: <FolderOpen size={20} />,
            label: 'Repositorios',
            count: stats.repos,
            description: 'Repos analizados'
        }
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'projects':
                return <ProjectsPage embedded />;
            case 'documents':
                return <DocumentsListPage embedded />;
            case 'apis':
                return <ApiTestPage embedded />;
            case 'repos':
                return <ReposPage embedded />;
            default:
                return <ProjectsPage embedded />;
        }
    };

    return (
        <div className={`workspace-page ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Sidebar */}
            <aside className="workspace-sidebar">
                <div className="sidebar-header">
                    <h2>Workspace</h2>
                    <button
                        className="collapse-btn"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {sidebarItems.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => handleSectionChange(item.id)}
                            title={sidebarCollapsed ? item.label : ''}
                        >
                            <span className="item-icon">{item.icon}</span>
                            {!sidebarCollapsed && (
                                <>
                                    <span className="item-label">{item.label}</span>
                                    {item.count > 0 && (
                                        <span className="item-count">{item.count}</span>
                                    )}
                                </>
                            )}
                        </button>
                    ))}
                </nav>

                {!sidebarCollapsed && (
                    <div className="sidebar-footer">
                        <div className="user-info">
                            <span className="user-icon"><User size={18} /></span>
                            <span className="user-name">{user?.username}</span>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="workspace-content">
                {renderContent()}
            </main>
        </div>
    );
}

export default WorkspacePage;
