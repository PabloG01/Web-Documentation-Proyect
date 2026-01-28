import React, { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/AppGuidePage.css';
import '../styles/MarkdownRenderer.css';
import '../styles/CodeBlockOverrides.css';

// Componente para bloques de código
function CodeBlock({ code, language = 'javascript', title }) {
    const [copied, setCopied] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="code-block-wrapper">
            <div className="code-block-header">
                <span className="code-language">{title || language}</span>
                <div className="code-actions">
                    <button
                        className="code-action-btn"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? 'Expandir' : 'Colapsar'}
                    >
                        {collapsed ? '⊕' : '⊖'}
                    </button>
                    <button
                        className="code-action-btn"
                        onClick={handleCopy}
                        title="Copiar código"
                    >
                        {copied ? '✓' : '📋'}
                    </button>
                </div>
            </div>
            {!collapsed && (
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    PreTag="div"
                >
                    {code}
                </SyntaxHighlighter>
            )}
        </div>
    );
}

// Componente de navegación lateral
function AppGuideSidebar({ activeSection, onNavigate }) {
    const sections = [
        { id: 'introduccion', title: 'Introducción', icon: '👋' },
        { id: 'primeros-pasos', title: 'Primeros Pasos', icon: '🚀' },
        { id: 'entornos', title: 'Entornos', icon: '🌍' },
        { id: 'proyectos', title: 'Proyectos', icon: '📁' },
        { id: 'documentos', title: 'Documentos', icon: '📄' },
        { id: 'repositorios', title: 'Repositorios', icon: '🔍' },
        { id: 'apis', title: 'APIs', icon: '🧪' },
        { id: 'api-tester', title: 'API Tester', icon: '⚡' },
        { id: 'api-keys', title: 'API Keys', icon: '🔑' },
    ];

    return (
        <aside className="app-guide-sidebar">
            <div className="sidebar-header">
                <h2>📖 Guía de la Aplicación</h2>
            </div>
            <nav className="sidebar-nav">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => onNavigate(section.id)}
                    >
                        <span className="sidebar-icon">{section.icon}</span>
                        <span className="sidebar-title">{section.title}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}

function AppGuidePage() {
    const [activeSection, setActiveSection] = useState('introduccion');
    const sectionRefs = useRef({});

    const handleNavigate = (sectionId) => {
        setActiveSection(sectionId);
        sectionRefs.current[sectionId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.5 }
        );

        Object.values(sectionRefs.current).forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="app-guide-page">
            <AppGuideSidebar activeSection={activeSection} onNavigate={handleNavigate} />

            <main className="guide-content">
                {/* Introducción */}
                <section
                    id="introduccion"
                    ref={el => sectionRefs.current['introduccion'] = el}
                    className="guide-section"
                >
                    <h1>Bienvenido a DocApp</h1>
                    <p className="lead-text">
                        Tu centro de comando unificado para documentación técnica. DocApp elimina la dispersión de información
                        centralizando tus documentos, especificaciones de API y repositorios de código en una sola plataforma intuitiva.
                    </p>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">📚</div>
                            <h3>Documentación Viva</h3>
                            <p>Crea manuales y guías en Markdown que tu equipo realmente querrá leer.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">⚡</div>
                            <h3>APIs Interactivas</h3>
                            <p>Visualiza, prueba y comparte tus endpoints API sin salir de la plataforma.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🔐</div>
                            <h3>Control Total</h3>
                            <p>Gestiona accesos granulares con Roles de Entorno y API Keys.</p>
                        </div>
                    </div>
                </section>

                {/* Dashboard (Home) */}
                <section
                    id="primeros-pasos"
                    ref={el => sectionRefs.current['primeros-pasos'] = el}
                    className="guide-section"
                >
                    <h1>🏠 Tu Tablero de Control</h1>
                    <p>
                        La página de inicio es tu punto de partida. Diseñada para darte acceso rápido a lo que necesitas trabajar ahora mismo.
                    </p>

                    <h2>Navegación Rápida</h2>
                    <ul className="functionality-list">
                        <li>
                            <strong>⚙️ Configuración de Entorno</strong>: Selecciona entre configuraciones predefinidas (Local, Producción, Personalizado) y configura la URL del servidor para probar tus APIs en diferentes ambientes.
                        </li>
                        <li>
                            <strong>📂 Vista Jerárquica</strong>: Tus proyectos se agrupan lógicamente. Expande un proyecto para ver sus documentos y APIs asociados de un vistazo.
                        </li>
                        <li>
                            <strong>🔑 Acceso con API Key</strong>: Conecta una API Key para acceder a la documentación sin necesidad de iniciar sesión. Ideal para compartir acceso temporal con colaboradores externos.
                        </li>
                    </ul>

                    <div className="info-box">
                        <h3>⚡ Acceso Rápido para Invitados</h3>
                        <p>
                            ¿Necesitas compartir documentación con alguien externo? Puedes usar el botón <strong>"Conectar API Key"</strong> en la home
                            para desbloquear el acceso a documentos protegidos sin necesidad de crear una cuenta completa de usuario.
                        </p>
                    </div>
                </section>

                {/* Entornos y Proyectos */}
                <section
                    id="entornos"
                    ref={el => sectionRefs.current['entornos'] = el}
                    className="guide-section"
                >
                    <h1>🌍 Organización del Trabajo</h1>
                    <p>DocApp estructura tu información en dos niveles para mantener el orden incluso en equipos grandes.</p>

                    <div className="comparison-table">
                        <div className="comparison-col">
                            <h3>1. Entornos (Contexto)</h3>
                            <p>Definen "dónde" vive un proyecto.</p>
                            <ul>
                                <li>📌 Ejemplos: <em>Dev, Staging, Prod</em></li>
                                <li>🎯 <strong>Uso</strong>: Separar versiones estables de las de prueba.</li>
                                <li>🎨 <strong>Visual</strong>: Se codifican por colores para evitar errores (ej. Rojo para Prod).</li>
                            </ul>
                            <p><em>Ve a <strong>Workspace → Entornos</strong> para configurarlos.</em></p>
                        </div>
                        <div className="comparison-col">
                            <h3>2. Proyectos (Contenedores)</h3>
                            <p>Agrupan los recursos relacionados.</p>
                            <ul>
                                <li>📌 Ejemplos: <em>API Pagos, App Móvil, Web Cliente</em></li>
                                <li>🎯 <strong>Uso</strong>: Contener Docs, Specs y Repos juntos.</li>
                                <li>🆔 <strong>Código</strong>: Tienen un prefijo único (ej. "PAY") para identificar sus recursos.</li>
                            </ul>
                            <p><em>Ve a <strong>Workspace → Proyectos</strong> para gestionarlos.</em></p>
                        </div>
                    </div>
                </section>

                {/* Documentos */}
                <section
                    id="documentos"
                    ref={el => sectionRefs.current['documentos'] = el}
                    className="guide-section"
                >
                    <h1>📄 Centro de Documentación</h1>
                    <p>
                        El editor de DocApp te permite escribir documentación técnica rica y estructurada sin distracciones.
                        Ideal para wikis, guías de onboarding, RFCs o manuales de usuario.
                    </p>

                    <h2>Capacidades del Editor</h2>
                    <ul className="capability-list">
                        <li>✨ <strong>Soporte Markdown Completo</strong>: Negritas, listas, tablas, citas y más.</li>
                        <li>💻 <strong>Bloques de Código</strong>: Resaltado de sintaxis para más de 50 lenguajes.</li>
                        <li>👁️ <strong>Vista Previa en Vivo</strong>: Ve exactamente cómo quedará tu documento mientras escribes.</li>
                        <li>📏 <strong>Estructura Clara</strong>: Asigna metadatos como Versión, Autor y Tipo de documento.</li>
                    </ul>

                    <div className="warning-box">
                        <h3>💡 Tip de Organización</h3>
                        <p>Asigna siempre tus documentos a un <strong>Proyecto</strong>. Esto permite que, al entrar al workspace de ese proyecto, todo tu equipo encuentre la documentación junto con el código y las APIs correspondientes.</p>
                    </div>
                </section>

                {/* Repositorios e Integraciones */}
                <section
                    id="repositorios"
                    ref={el => sectionRefs.current['repositorios'] = el}
                    className="guide-section"
                >
                    <h1>🔗 Integración de Código</h1>
                    <p>
                        Conecta tus repositorios de <strong>GitHub</strong> o <strong>Bitbucket</strong> para mantener tu documentación sincronizada con tu código fuente.
                    </p>

                    <h2>¿Qué puedes hacer?</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Importar Repositorios</h3>
                                <p>Vincula repos públicos o privados. DocApp mantendrá un enlace directo al código fuente para referencia rápida.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Análisis Automático (IA)</h3>
                                <p>
                                    Nuestra IA puede leer tu código en busca de rutas de API, modelos de datos y comentarios.
                                    Úsalo para generar borradores de documentación técnica sin escribir una sola línea.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* APIs y Testing */}
                <section
                    id="apis"
                    ref={el => sectionRefs.current['apis'] = el}
                    className="guide-section"
                >
                    <h1>🧪 Gestión de APIs</h1>
                    <p>El corazón de DocApp. Centraliza, visualiza y prueba tus contratos de API (OpenAPI/Swagger).</p>

                    <h2>3 Formas de añadir APIs</h2>
                    <ol className="simple-list">
                        <li><strong>Subida Manual</strong>: Carga tus archivos `.json` o `.yaml` existentes.</li>
                        <li><strong>Desde Repositorio</strong>: Selecciona un archivo de spec directamente desde GitHub/Bitbucket.</li>
                        <li><strong>Generación IA</strong>: Sube un archivo de código (ej. rutas de Express) y deja que la IA redacte la especificación por ti.</li>
                    </ol>

                    <h2>Visualización y Pruebas</h2>
                    <p>Una vez añadida una API, tienes acceso a herramientas poderosas:</p>

                    <div className="features-grid">
                        <div className="feature-card">
                            <h3>👁️ Swagger UI Integrado</h3>
                            <p>Visualización estándar de la industria. Navega endpoints, esquemas y modelos de datos de forma interactiva.</p>
                        </div>
                        <div className="feature-card">
                            <h3>⚡ API Tester Nativo</h3>
                            <p>
                                Un cliente HTTP potente integrado en tu navegador (similar a Postman).
                                <br />
                                ✅ Soporta Variables de Entorno
                                <br />
                                ✅ Historial de Peticiones
                                <br />
                                ✅ Autocompletado de Endpoints
                            </p>
                        </div>
                    </div>
                </section>

                {/* API Keys (Seguridad) */}
                <section
                    id="api-keys"
                    ref={el => sectionRefs.current['api-keys'] = el}
                    className="guide-section"
                >
                    <h1>🔑 Seguridad M2M y Accesos</h1>
                    <p>
                        Gestiona cómo otras aplicaciones (o desarrolladores externos) interactúan con tus recursos a través de <strong>API Keys</strong>.
                    </p>

                    <h2>Control Total</h2>
                    <ul className="functionality-list">
                        <li>
                            <strong>Ámbito (Scope)</strong>: Crea keys maestras (acceso global) o keys limitadas a un solo proyecto.
                        </li>
                        <li>
                            <strong>Caducidad</strong>: Define fechas de expiración automática para accesos temporales.
                        </li>
                        <li>
                            <strong>Revocación</strong>: Invalida el acceso de una key comprometida con un solo clic, sin afectar a las demás.
                        </li>
                    </ul>

                    <div className="info-box">
                        <h3>📊 Monitoreo en Tiempo Real</h3>
                        <p>
                            DocApp incluye un sistema de auditoría en vivo.
                            <br />
                            Vigilamos cada vez que se usa una key y te mostramos gráficas de uso, IPs de origen y endpoints accedidos.
                            <strong> Los contadores se actualizan instantáneamente</strong> en tu pantalla para que siempre tengas la foto real del tráfico.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default AppGuidePage;
