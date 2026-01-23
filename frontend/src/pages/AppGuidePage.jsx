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
                        <strong>DocApp</strong> es una plataforma integral para gestionar documentación técnica y especificaciones OpenAPI.
                        Permite centralizar proyectos, generar documentación automáticamente desde código, y gestionar accesos mediante API Keys.
                    </p>

                    <div className="info-box">
                        <h3>✨ Características principales</h3>
                        <ul>
                            <li><strong>Autenticación</strong>: Registro, login y OAuth con GitHub/Bitbucket</li>
                            <li><strong>Entornos</strong>: Organiza proyectos por contexto (Dev, Staging, Prod)</li>
                            <li><strong>Proyectos</strong>: Contenedores con código, color y workspace integrado</li>
                            <li><strong>Documentos Markdown</strong>: Editor con vista previa y versionado</li>
                            <li><strong>Especificaciones OpenAPI</strong>: From JSDoc comments, archivos o repos</li>
                            <li><strong>Repositorios</strong>: GitHub/Bitbucket con análisis automático de código</li>
                            <li><strong>API Keys</strong>: Acceso M2M con monitoreo de uso en tiempo real</li>
                            <li><strong>API Tester</strong>: Prueba endpoints directamente desde la UI</li>
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

                    <h2>1. Autenticación y Registro</h2>
                    <p>DocApp ofrece múltiples formas de autenticación para adaptarse a tu flujo de trabajo:</p>

                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Registro Tradicional</h3>
                                <p>Crea una cuenta con tu <strong>email y contraseña</strong> desde el botón "Registrarse".</p>
                                <ul>
                                    <li>Username único</li>
                                    <li>Email válido</li>
                                    <li>Contraseña segura</li>
                                </ul>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>OAuth con GitHub/Bitbucket (Opcional)</h3>
                                <p>Conecta tu cuenta de <strong>GitHub</strong> o <strong>Bitbucket</strong> para:</p>
                                <ul>
                                    <li>Importar repositorios directamente</li>
                                    <li>Analizar código automáticamente</li>
                                    <li>Generar specs desde repos privados</li>
                                </ul>
                                <p><em>Requiere configurar credenciales OAuth (Client ID y Secret) por usuario</em></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Sesión Única</h3>
                                <p>DocApp mantiene <strong>una sola sesión activa</strong> por usuario para mayor seguridad. Al iniciar sesión en un nuevo dispositivo, las sesiones anteriores se cerrarán automáticamente.</p>
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
                        Los entornos te permiten organizar tus proyectos según el contexto: <strong>desarrollo, staging, producción,</strong> etc.
                        Son especialmente útiles para equipos que trabajan con múltiples ambientes.
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
                                <p>Haz clic en el botón <strong>"+ Crear Entorno"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Completa el formulario:</p>
                                <ul>
                                    <li><strong>Nombre</strong>: Ej. "Desarrollo", "Producción", "Staging"</li>
                                    <li><strong>Descripción</strong>: Breve descripción del propósito del entorno</li>
                                    <li><strong>Color</strong>: Elige un color para identificación visual rápida</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="warning-box">
                        <h3>💡 Consejo</h3>
                        <p>Usa entornos separados para cada etapa de tu ciclo de desarrollo. Los proyectos se pueden filtrar por entorno para una vista rápida del estado de cada ambiente.</p>
                    </div>
                </section>

                {/* Proyectos */}
                <section
                    id="proyectos"
                    ref={el => sectionRefs.current['proyectos'] = el}
                    className="guide-section"
                >
                    <h1>📁 Proyectos</h1>
                    <p>Los proyectos son la unidad organizativa principal de DocApp. Cada proyecto es un contenedor para documentos, especificaciones OpenAPI y repositorios vinculados.</p>

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
                                <p>Haz clic en el botón <strong>"+ Crear Proyecto"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Completa el formulario con toda la información:</p>
                                <ul>
                                    <li><strong>Código</strong>: Identificador corto (ej. "SGG", "API", "CORE") - aparecerá como prefijo en todos los recursos</li>
                                    <li><strong>Nombre</strong>: Nombre descriptivo completo del proyecto</li>
                                    <li><strong>Descripción</strong>: Detalles sobre el proyecto (opcional)</li>
                                    <li><strong>Color</strong>: Color para identificación visual – aparecerá como borde lateral en las tarjetas</li>
                                    <li><strong>Entorno</strong>: Asigna el entorno al que pertenece (Dev, Prod, etc.)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="info-box">
                        <h3>✨ Workspace Integrado</h3>
                        <p>Al hacer clic en "Ver Workspace" en un proyecto, accedes a una vista unificada con:</p>
                        <ul>
                            <li>Todos los <strong>documentos</strong> del proyecto</li>
                            <li>Todas las <strong>especificaciones OpenAPI</strong> asociadas</li>
                            <li>Todos los <strong>repositorios</strong> vinculados</li>
                            <li>Acceso directo al <strong>API Tester</strong></li>
                        </ul>
                    </div>

                    <h2>Gestionar proyectos</h2>
                    <p>Desde la lista de proyectos puedes:</p>
                    <ul>
                        <li>✏️ <strong>Editar</strong>: Modificar nombre, código, color y entorno</li>
                        <li>🗑️ <strong>Eliminar</strong>: Borrar proyecto y todo su contenido asociado</li>
                        <li>👁️ <strong>Ver Workspace</strong>: Acceder a todos los recursos del proyecto</li>
                        <li>🔍 <strong>Filtrar</strong>: Por entorno o por búsqueda de texto</li>
                    </ul>
                </section>

                {/* Documentos */}
                <section
                    id="documentos"
                    ref={el => sectionRefs.current['documentos'] = el}
                    className="guide-section"
                >
                    <h1>📄 Documentos</h1>
                    <p>Crea y gestiona documentación técnica en formato <strong>Markdown</strong> con vista previa en tiempo real. Cada documento se asocia a un proyecto específico.</p>

                    <h2>Crear un documento</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Crear → Documento</strong> en el menú principal</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <p>Completa el formulario con toda la información:</p>
                                <ul>
                                    <li><strong>Proyecto</strong>: Selecciona el proyecto al que pertenece</li>
                                    <li><strong>Tipo</strong>: Manual, Tutorial, Guía, Referencia, API Doc, etc.</li>
                                    <li><strong>Título</strong>: Nombre descriptivo del documento</li>
                                    <li><strong>Descripción</strong>: Resumen breve del contenido</li>
                                    <li><strong>Contenido (Markdown)</strong>: Escribe usando sintaxis Markdown</li>
                                    <li><strong>Versión</strong>: Número de versión (ej. 1.0.0)</li>
                                    <li><strong>Autor</strong>: Nombre del autor</li>
                                </ul>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <p>Usa la <strong>vista previa</strong> para verificar cómo se verá el documento renderizado</p>
                            </div>
                        </div>
                    </div>

                    <h2>Soporte de Markdown</h2>
                    <p>Los documentos soportan todo el estándar Markdown incluyendo:</p>

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
                    <h1>� Repositorios</h1>
                    <p>
                        Conecta repositorios de <strong>GitHub</strong> o <strong>Bitbucket</strong> para analizar automáticamente el código
                        y generar especificaciones OpenAPI desde comentarios JSDoc/Swagger o estructura de rutas.
                    </p>

                    <h2>Conectar con GitHub/Bitbucket</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Configurar OAuth (Opcional)</h3>
                                <p>Para acceder a repositorios privados, configura tus credenciales OAuth:</p>
                                <ul>
                                    <li>Crea una OAuth App en GitHub o Bitbucket</li>
                                    <li>Guarda el <strong>Client ID</strong> y <strong>Client Secret</strong> en tu perfil de usuario</li>
                                    <li>Define el <strong>Callback URL</strong> de tu aplicación</li>
                                </ul>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Conectar Cuenta</h3>
                                <p>Click en <strong>"Conectar GitHub"</strong> o <strong>"Conectar Bitbucket"</strong> y autoriza el acceso</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Seleccionar Repositorio</h3>
                                <p>Elige visibilidad (públicos/privados/todos) y selecciona el repositorio a analizar</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <h3>Analizar Código</h3>
                                <p>El sistema buscará:</p>
                                <ul>
                                    <li>Archivos con rutas API (.js, .ts, .py, etc.)</li>
                                    <li>Comentarios JSDoc/Swagger</li>
                                    <li>Endpoints y métodos HTTP</li>
                                    <li>Parámetros y schemas</li>
                                </ul>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">5</div>
                            <div className="step-content">
                                <h3>Generar Especificación</h3>
                                <p>Selecciona archivos analizados y genera una especificación OpenAPI completa</p>
                            </div>
                        </div>
                    </div>

                    <div className="info-box">
                        <h3>🤖 Análisis Automático</h3>
                        <p>
                            El sistema puede usar <strong>Google Gemini</strong> (si configuras API Key) para mejorar la documentación generada,
                            agregando descripciones, ejemplos y detalles adicionales.
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
                                <p>Si no existen tokens la aplicación generará una especificación OpenAPI basadas en el código</p>
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
                    <h1>🔑 API Keys - Acceso Machine-to-Machine</h1>
                    <p>
                        Las API Keys permiten <strong>acceso programático</strong> (M2M - Machine to Machine) a la plataforma sin necesidad de autenticación
                        con usuario y contraseña. Ideal para integraciones, CI/CD, scripts automatizados y acceso desde otras aplicaciones.
                    </p>

                    <div className="info-box">
                        <h3>✨ ¿Qué son las API Keys?</h3>
                        <p>Son claves de acceso que reemplazan la autenticación tradicional de usuario, permitiendo:</p>
                        <ul>
                            <li><strong>Acceso automatizado</strong>: Scripts, servidores, piplines CI/CD</li>
                            <li><strong>Acceso global o restringido</strong>: Todas tus resources o solo un proyecto</li>
                            <li><strong>Monitoreo de uso</strong>: Rastrea cada acceso en tiempo real</li>
                            <li><strong>Expiración configurable</strong>: Define tiempo de vida o sin expiración</li>
                            <li><strong>Revocación instantánea</strong>: Desactiva acceso en cualquier momento</li>
                        </ul>
                    </div>

                    <h2>Crear una API Key</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <p>Ve a <strong>Workspace → API Keys</strong> y click en <strong>"+ Generar Nueva Key"</strong></p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Configurar la Key</h3>
                                <ul>
                                    <li><strong>Nombre</strong>: Identificador descriptivo (ej. "Servidor Producción", "CI/CD Pipeline")</li>
                                    <li><strong>Días hasta expiración</strong>: Déjalo vacío para sin expiración, o define días (ej. 90)</li>
                                    <li><strong>Ámbito de Acceso</strong>:
                                        <ul>
                                            <li>🌐 <strong>Acceso Global</strong>: Accede a todos tus proyectos, documentos y APIs</li>
                                            <li>📁 <strong>Proyecto Específico</strong>: Solo accede a recursos del proyecto seleccionado</li>
                                        </ul>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Copiar la Key</h3>
                                <p><strong>⚠️ IMPORTANTE:</strong> La key completa se muestra <strong>solo una vez</strong>. Cópiala inmediatamente y guárdala de forma segura.</p>
                            </div>
                        </div>
                    </div>

                    <h2>Usar la API Key</h2>
                    <p>Incluye el header <code>X-API-Key</code> en tus requests HTTP:</p>

                    <CodeBlock
                        language="bash"
                        title="Ejemplo de uso con curl"
                        code={`# GET request con API Key
curl -H "X-API-Key: docapp_xxxxxxxxxxxxxxxxx" \\
  https://tu-dominio.com/api-specs

# POST request
curl -X POST \\
  -H "X-API-Key: docapp_xxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Mi Especificación"}' \\
  https://tu-dominio.com/api-specs`}
                    />

                    <h2>📊 Monitoreo de Uso</h2>
                    <p>Cada API Key rastrea automáticamente su uso. En la lista de keys verás:</p>

                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Badge de Usos</h3>
                                <p>Click en el badge <strong>📊 Usos: X</strong> para abrir el modal de estadísticas</p>
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Modal de Estadísticas</h3>
                                <p>Verás información detallada:</p>
                                <ul>
                                    <li>📊 <strong>Total de usos</strong>: Contador acumulado de todas las veces que se usó</li>
                                    <li>📝 <strong>Últimos 10 accesos</strong>: Tabla con detalles de cada uso:
                                        <ul>
                                            <li><strong>Fecha/Hora</strong>: Cuándo se usó</li>
                                            <li><strong>Método HTTP</strong>: GET, POST, PUT, DELETE (con colores)</li>
                                            <li><strong>Endpoint</strong>: Ruta accedida</li>
                                            <li><strong>IP</strong>: Dirección IP del cliente</li>
                                        </ul>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="warning-box">
                        <h3>🔒 Seguridad</h3>
                        <p>Solo se guardan los <strong>últimos 10 accesos</strong> por eficiencia. Los logs más antiguos se eliminan automáticamente.</p>
                    </div>

                    <h2>Gestionar API Keys</h2>

                    <div className="benefits-grid">
                        <div className="benefit-card">
                            <div className="benefit-icon">🚫</div>
                            <h3>Revocar</h3>
                            <p>Desactiva la key sin borrarla. Aparecerá con estado "Revocada" y puedes eliminarla después.</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">🗑️</div>
                            <h3>Eliminar</h3>
                            <p>Borra permanentemente keys revocadas o expiradas. Solo aparece para keys inactivas.</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">⚡</div>
                            <h3>Estados Visuales</h3>
                            <p>
                                ✅ Activa (borde verde)<br />
                                🚫 Revocada (borde gris)<br />
                                ❌ Expirada (borde rojo)
                            </p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">📊</div>
                            <h3>Monitoreo</h3>
                            <p>Rastreo en tiempo real de cada uso con IP, endpoint y método HTTP.</p>
                        </div>
                    </div>

                    <div className="info-box">
                        <h3>💡 Mejores Prácticas</h3>
                        <ul>
                            <li>Usa <strong>nombres descriptivos</strong> que identifiquen su propósito</li>
                            <li>Limita el <strong>alcance</strong> cuando sea posible (por proyecto vs global)</li>
                            <li>Define <strong>expiración</strong> para keys temporales</li>
                            <li><strong>Monitorea uso regularmente</strong> para detectar actividad sospechosa</li>
                            <li><strong>Revoca keys</strong> que no estés usando</li>
                            <li><strong>Rota keys</strong> periódicamente en producción</li>
                        </ul>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default AppGuidePage;
