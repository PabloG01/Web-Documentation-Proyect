import React, { useState, useContext, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { projectsAPI, documentsAPI, apiSpecsAPI, reposAPI, environmentsAPI } from '../services/api';
import { Folder, FileText, Globe, FolderOpen, User, ChevronLeft, ChevronRight, Layout, Code, Key } from '../components/Icons';
import '../styles/WorkspacePage.css';

// Import existing page components to reuse
import EnvironmentsPage from './EnvironmentsPage';
import ProjectsPage from './ProjectsPage';
import DocumentsListPage from './DocumentsListPage';
import ApiTestPage from './ApiTestPage';
import ReposPage from './ReposPage';
import ApiTesterPage from './ApiTesterPage';
import ApiKeysPage from './ApiKeysPage';

function WorkspacePage() {
    const { user } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();

    // Active section from URL or default
    const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'environments');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Stats for sidebar badges
    const [stats, setStats] = useState({
        environments: 0,
        projects: 0,
        documents: 0,
        apis: 0,
        repos: 0
    });

    // Load stats on mount
    useEffect(() => {
        loadStats();
    }, []);



    const loadStats = async () => {
        try {
            const [environmentsRes, projectsRes, docsRes, apisRes, reposRes] = await Promise.all([
                environmentsAPI.getAll().catch(() => ({ data: [] })),
                projectsAPI.getAll().catch(() => ({ data: [] })),
                documentsAPI.getAll().catch(() => ({ data: [] })),
                apiSpecsAPI.getAll().catch(() => ({ data: [] })),
                reposAPI.getAll().catch(() => ({ data: [] }))
            ]);

            // Helper to extract count safely from various response formats
            const getCount = (res) => {
                if (!res || !res.data) return 0;
                // Direct array
                if (Array.isArray(res.data)) return res.data.length;
                // Paginated response style { data: [], ... }
                if (res.data.data && Array.isArray(res.data.data)) return res.data.data.length;
                // Count property
                if (typeof res.data.count === 'number') return res.data.count;
                if (typeof res.data.total === 'number') return res.data.total;
                return 0;
            };

            setStats({
                environments: getCount(environmentsRes),
                projects: getCount(projectsRes),
                documents: getCount(docsRes),
                apis: getCount(apisRes),
                repos: getCount(reposRes)
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    // Callback for child components to trigger stats reload
    const handleStatsChange = () => {
        loadStats();
    };

    const handleEnvironmentNavigate = (section, environmentId) => {
        // Update URL to include environment_id parameter
        setSearchParams({ section, environment_id: environmentId });
        setActiveSection(section);
        loadStats();
    };

    const handleSectionChange = (section) => {
        setActiveSection(section);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('section', section);
        // Clean up environment_id when switching main sections unless it's relevant
        // Fix: Force reset environment_id when clicking on Projects sidebar item to show all projects
        if (section === 'projects') {
            newParams.delete('environment_id');
        }
        setSearchParams(newParams);

        // Reload stats when changing sections to ensure fresh data
        loadStats();
    };

    const sidebarItems = [
        {
            id: 'environments',
            icon: <Layout size={20} />,
            label: 'Entornos',
            count: stats.environments,
            description: 'Gestiona tus entornos'
        },
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
            id: 'api-tester',
            icon: <span style={{ fontSize: '18px' }}><Code size={20} /></span>,
            label: 'API Tester',
            count: stats.apis,
            description: 'Prueba APIs en vivo'
        },
        {
            id: 'repos',
            icon: <FolderOpen size={20} />,
            label: 'Repositorios',
            count: stats.repos,
            description: 'Repos analizados'
        },
        {
            id: 'api-keys',
            icon: <span style={{ fontSize: '18px' }}><Key size={20} /></span>,
            label: 'API Keys',
            count: null,
            description: 'Gestiona tus claves de acceso'
        }
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'environments':
                return <EnvironmentsPage embedded onStatsChange={handleStatsChange} onNavigate={handleEnvironmentNavigate} />;
            case 'projects':
                return <ProjectsPage embedded onStatsChange={handleStatsChange} />;
            case 'documents':
                return <DocumentsListPage embedded onStatsChange={handleStatsChange} />;
            case 'apis':
                return <ApiTestPage embedded onStatsChange={handleStatsChange} />;
            case 'api-tester':
                return <ApiTesterPage embedded onStatsChange={handleStatsChange} />;
            case 'repos':
                return <ReposPage embedded onStatsChange={handleStatsChange} />;
            case 'api-keys':
                return <ApiKeysPage />;
            default:
                return <EnvironmentsPage embedded onStatsChange={handleStatsChange} />;
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
                        {sidebarCollapsed ? <ChevronRight size={18} color="#000000ff" /> : <ChevronLeft size={18} color="#000000ff" />}
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
