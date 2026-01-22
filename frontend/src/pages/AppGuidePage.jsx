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
                    <h1>👋 Bienvenido a DocApp</h1>
                    <p>
                        <strong>DocApp</strong> es una plataforma integral para gestionar la documentación de tus proyectos y APIs.
                        Facilita la creación, organización y visualización de documentación técnica de manera profesional.
                    </p>

                    <div className="info-box">
                        <h3>✨ Características principales</h3>
                        <ul>
                            <li>🌍 <strong>Entornos</strong>: Organiza tus proyectos por entorno (desarrollo, producción, etc.)</li>
                            <li>📁 <strong>Proyectos</strong>: Gestiona múltiples proyectos de forma centralizada</li>
                            <li>📄 <strong>Documentos</strong>: Crea documentación en Markdown con vista previa</li>
                            <li>🔍 <strong>Repositorios</strong>: Genera documentación automáticamente desde tu código</li>
                            <li>🧪 <strong>APIs</strong>: Visualiza y prueba especificaciones OpenAPI</li>
                            <li>⚡ <strong>API Tester</strong>: Prueba endpoints en tiempo real</li>
                            <li>🔑 <strong>API Keys</strong>: Comparte acceso a proyectos sin necesidad de registro</li>
                        </ul>
                    </div>
                </section>

                {/* Primeros Pasos */}
                <section
                    id="primeros-pasos"
                    ref={el => sectionRefs.current['primeros-pasos'] = el}
                    className="guide-section"
                >
                    <h1>🚀 Primeros Pasos</h1>

                    <h2>1. Registro e Inicio de Sesión</h2>
                    <p>Para comenzar a usar DocApp, primero debes crear una cuenta:</p>

                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Crear una cuenta</h3>
                                <p>Haz clic en <strong>"Registrarse"</strong> en el menú superior y completa el formulario con tu información.</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Iniciar sesión</h3>
                                <p>Una vez registrado, inicia sesión con tus credenciales desde el botón <strong>"Iniciar Sesión"</strong>.</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Acceder al Workspace</h3>
                                <p>Después de iniciar sesión, verás el menú completo con la opción <strong>"Workspace"</strong> donde podrás gestionar todo tu contenido.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Entornos */}
                <section
                    id="entornos"
                    ref={el => sectionRefs.current['entornos'] = el}
                    className="guide-section"
                >
                    <h1>🌍 Entornos</h1>
                    <p>
                        Los entornos te permiten organizar tus proyectos según el contexto: desarrollo, staging, producción, etc.
                    </p>

                    <h2>Crear un nuevo entorno</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Workspace → Entornos</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Haz clic en el botón <strong>"Crear Entorno"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Completa el formulario:</p>
                                <ul>
                                    <li><strong>Nombre</strong>: Ej. "Desarrollo", "Producción"</li>
                                    <li><strong>Descripción</strong>: Breve descripción del entorno</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="warning-box">
                        <h3>💡 Consejo</h3>
                        <p>Crea entornos separados para cada etapa de tu ciclo de desarrollo para mantener una mejor organización.</p>
                    </div>
                </section>

                {/* Proyectos */}
                <section
                    id="proyectos"
                    ref={el => sectionRefs.current['proyectos'] = el}
                    className="guide-section"
                >
                    <h1>📁 Proyectos</h1>
                    <p>Los proyectos son contenedores para tu documentación y APIs. Cada proyecto se vincula a un entorno.</p>

                    <h2>Crear un proyecto</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Workspace → Proyectos</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Haz clic en el botón <strong>"Crear Proyecto"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Completa los campos:</p>
                                <ul>
                                    <li><strong>Nombre</strong>: Nombre del proyecto</li>
                                    <li><strong>Extensión</strong>: Identificador único (ej. "api-v1")</li>
                                    <li><strong>Descripción</strong>: Descripción del proyecto</li>
                                    <li><strong>Entorno</strong>: Selecciona el entorno asociado</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <h2>Gestionar proyectos</h2>
                    <p>Desde la lista de proyectos puedes:</p>
                    <ul>
                        <li>✏️ Editar información del proyecto</li>
                        <li>🗑️ Eliminar proyectos que ya no necesites</li>
                        <li>👁️ Ver todos los documentos y APIs asociados</li>
                    </ul>
                </section>

                {/* Documentos */}
                <section
                    id="documentos"
                    ref={el => sectionRefs.current['documentos'] = el}
                    className="guide-section"
                >
                    <h1>📄 Documentos</h1>
                    <p>Crea y gestiona documentación técnica en formato Markdown con vista previa en tiempo real.</p>

                    <h2>Crear un documento</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Workspace → Documentos</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Haz clic en el botón <strong>"Crear Documento"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Completa el formulario:</p>
                                <ul>
                                    <li><strong>Título</strong>: Nombre del documento</li>
                                    <li><strong>Proyecto</strong>: Proyecto al que pertenece</li>
                                    <li><strong>Contenido</strong>: Escribe en Markdown</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <h2>Soporte de Markdown</h2>
                    <p>Los documentos soportan todo el estándar Markdown:</p>

                    <CodeBlock
                        language="markdown"
                        title="Ejemplo de Markdown"
                        code={`# Título principal
## Subtítulo

**Texto en negrita** y *texto en cursiva*

- Lista con viñetas
- Otro elemento

\`\`\`javascript
// Bloques de código
function ejemplo() {
  console.log("Hola mundo");
}
\`\`\`

[Enlaces](https://ejemplo.com)
![Imágenes](url-imagen.png)`}
                    />
                </section>

                {/* Repositorios */}
                <section
                    id="repositorios"
                    ref={el => sectionRefs.current['repositorios'] = el}
                    className="guide-section"
                >
                    <h1>🔍 Repositorios</h1>
                    <p>
                        DocApp puede analizar automáticamente el código de tus repositorios y generar documentación OpenAPI
                        usando inteligencia artificial.
                    </p>

                    <h2>Analizar un repositorio</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Workspace → Repositorios</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Ingresa la <strong>URL del repositorio</strong> (debe ser público)</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Haz clic en <strong>"Analizar Repositorio"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <p>El sistema analizará el código y generará la especificación OpenAPI automáticamente</p>
                            </div>
                        </div>
                    </div>

                    <div className="info-box">
                        <h3>🤖 Análisis con IA</h3>
                        <p>
                            El sistema utiliza Google Gemini para analizar tu código, detectar endpoints,
                            parámetros y generar ejemplos realistas basados en la estructura de tu proyecto.
                        </p>
                    </div>


                </section>

                {/* APIs */}
                <section
                    id="apis"
                    ref={el => sectionRefs.current['apis'] = el}
                    className="guide-section"
                >
                    <h1>🧪 APIs</h1>
                    <p>Visualiza y gestiona especificaciones OpenAPI con Swagger UI integrado.</p>

                    <h2>Subir una especificación OpenAPI</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Workspace → APIs</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Haz clic en el botón <strong>"Subir Spec"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Selecciona tu archivo <code>openapi.json</code> o <code>swagger.json</code></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <p>Asocia la especificación a un <strong>proyecto</strong></p>
                            </div>
                        </div>
                    </div>

                    <h2>Generar OpenAPI desde código JavaScript</h2>
                    <p>
                        DocApp también puede <strong>analizar archivos .js directamente</strong> y generar automáticamente
                        una especificación OpenAPI usando inteligencia artificial.
                    </p>

                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>En la sección <strong>APIs</strong>, haz clic en <strong>"Subir Spec"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Selecciona un archivo <code>.js</code> (ej. tu archivo de rutas Express)</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>La aplicación analizará el código automáticamente con IA.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <p>Si no existen tokens la applicación generará una especificación OpenAPI basadas en el código</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">5</div>
                            <div className="step-content">
                                <p>Se generará una especificación OpenAPI completa con endpoints, parámetros y ejemplos</p>
                            </div>
                        </div>
                    </div>

                    <div className="info-box">
                        <h3>🤖 Análisis Inteligente</h3>
                        <p>
                            El sistema utiliza Google Gemini para analizar tu código JavaScript, detectar rutas,
                            métodos HTTP, parámetros y generar automáticamente una especificación OpenAPI válida.
                        </p>
                    </div>



                    <h2>Visualizar con Swagger UI</h2>
                    <p>Una vez subida la especificación, puedes:</p>
                    <ul>
                        <li>📖 Ver la documentación interactiva completa</li>
                        <li>🧪 Probar endpoints directamente desde el navegador</li>
                        <li>📥 Descargar la especificación en formato JSON</li>
                        <li>🔗 Compartir el enlace con tu equipo</li>
                    </ul>
                </section>

                {/* API Tester */}
                <section
                    id="api-tester"
                    ref={el => sectionRefs.current['api-tester'] = el}
                    className="guide-section"
                >
                    <h1>⚡ API Tester</h1>
                    <p>Herramienta interactiva para probar endpoints de tus APIs en tiempo real.</p>

                    <h2>Usar el API Tester</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Workspace → API Tester</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Selecciona una <strong>especificación API</strong> de tu lista</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Elige un <strong>ambiente</strong> (opcional) para cargar variables de entorno</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <p>El <strong>Server URL</strong> se cargará automáticamente desde la spec</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">5</div>
                            <div className="step-content">
                                <p>Selecciona un <strong>endpoint</strong> y método HTTP</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">6</div>
                            <div className="step-content">
                                <p>Haz clic en <strong>"Send Request"</strong> para probar el endpoint</p>
                            </div>
                        </div>
                    </div>

                    <h2>Características del Tester</h2>
                    <div className="benefits-grid">
                        <div className="benefit-card">
                            <div className="benefit-icon">🎯</div>
                            <h3>Headers personalizados</h3>
                            <p>Agrega headers de autenticación y personalización</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">📊</div>
                            <h3>Body JSON</h3>
                            <p>Envía payloads complejos en formato JSON</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">⚡</div>
                            <h3>Respuesta en tiempo real</h3>
                            <p>Ve el status code, headers y body de la respuesta</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">📝</div>
                            <h3>Historial</h3>
                            <p>Guarda y repite peticiones anteriores</p>
                        </div>
                    </div>
                </section>

                {/* API Keys */}
                <section
                    id="api-keys"
                    ref={el => sectionRefs.current['api-keys'] = el}
                    className="guide-section"
                >
                    <h1>🔑 API Keys</h1>
                    <p>
                        Las API Keys te permiten <strong>compartir acceso a proyectos específicos</strong> con personas que no tienen
                        una cuenta en DocApp, permitiéndoles visualizar la documentación de tus APIs.
                    </p>

                    <h2>¿Para qué sirven las API Keys?</h2>
                    <div className="info-box">
                        <h3>💡 Casos de uso</h3>
                        <ul>
                            <li>Compartir documentación de APIs con clientes externos</li>
                            <li>Permitir a colaboradores visualizar especificaciones sin necesidad de registro</li>
                            <li>Generar acceso público a documentación de proyectos específicos</li>
                            <li>Facilitar la integración con terceros sin comprometer la seguridad</li>
                        </ul>
                    </div>

                    <h2>Crear una API Key</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Workspace → API Keys</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Haz clic en el botón <strong>"Crear API Key"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Completa el formulario:</p>
                                <ul>
                                    <li><strong>Nombre</strong>: Identificador de la API Key (ej. "Cliente XYZ")</li>
                                    <li><strong>Proyecto</strong>: Selecciona el proyecto al que dará acceso</li>
                                    <li><strong>Descripción</strong> (opcional): Propósito de la API Key</li>
                                </ul>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <p>La aplicación generará una <strong>clave única</strong> automáticamente</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">5</div>
                            <div className="step-content">
                                <p>Copia la API Key y compártela con las personas que necesiten acceso</p>
                            </div>
                        </div>
                    </div>

                    <h2>Gestionar API Keys</h2>
                    <p>Desde la sección de API Keys puedes:</p>
                    <ul>
                        <li>📋 Ver todas las API Keys creadas</li>
                        <li>👁️ Consultar a qué proyecto está asociada cada clave</li>
                        <li>🗑️ Eliminar API Keys que ya no necesites</li>
                        <li>📊 Monitorear el uso de cada clave</li>
                    </ul>

                    <div className="warning-box">
                        <h3>🔒 Seguridad</h3>
                        <p>
                            Las API Keys solo permiten <strong>visualizar</strong> la documentación del proyecto asociado.
                            No otorgan permisos de edición ni acceso a otros proyectos. Puedes revocar una API Key
                            en cualquier momento eliminándola desde la sección de gestión.
                        </p>
                    </div>
                </section>

                <div className="guide-footer">
                    <h2>¿Necesitas más ayuda?</h2>
                    <p>
                        Si tienes dudas sobre alguna funcionalidad específica, consulta la{' '}
                        <a href="/guides/openapi">Guía OpenAPI</a> para aprender más sobre especificaciones de API.
                    </p>
                </div>
            </main>
        </div>
    );
}

export default AppGuidePage;
