import React, { useState, useRef, useEffect } from 'react';
import GuideSidebar from '../components/GuideSidebar';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/AppGuidePage.css'; // Shared styles for guides
import '../styles/OpenApiGuidePage.css'; // Local overrides
import '../styles/MarkdownRenderer.css';
import '../styles/CodeBlockOverrides.css';
import { FileCode, Server, Wrench, Box, Coffee } from 'lucide-react';

// Componente para bloques de código con estilo consistente
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

function OpenApiGuidePage() {
    const [activeSection, setActiveSection] = useState('what-is-openapi');
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
        <div className="app-guide-page openapi-guide-page">
            <GuideSidebar activeSection={activeSection} onNavigate={handleNavigate} />

            <main className="guide-content">
                {/* Introducción */}
                <section
                    id="what-is-openapi"
                    ref={el => sectionRefs.current['what-is-openapi'] = el}
                    className="guide-section"
                >
                    <h1>¿Qué es OpenAPI?</h1>
                    <p className="lead-text">
                        OpenAPI (anteriormente conocido como Swagger) es el estándar mundial para describir APIs RESTful.
                        Es un contrato legible tanto para humanos como para máquinas que potencia todo tu ciclo de desarrollo.
                    </p>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon"><FileCode size={30} className='text-icon' /></div>
                            <h3>Auto-Documentación</h3>
                            <p>Convierte tu código en documentación interactiva y preciosa sin esfuerzo manual.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><Server size={30} className='text-icon' /></div>
                            <h3>Generación de Código</h3>
                            <p>Crea clientes SDK y servidores stub para más de 50 lenguajes automáticamente.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><Wrench size={30} className='text-icon' /></div>
                            <h3>Testing Simplificado</h3>
                            <p>Valida tus requests y responses contra un contrato estricto para evitar bugs.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><Box size={30} className='text-icon' /></div>
                            <h3>Contrato Universal</h3>
                            <p>Un lenguaje común para equipos Frontend, Backend y DevOps.</p>
                        </div>
                    </div>
                </section>
                <section
                    id="openapi-structure"
                    ref={el => sectionRefs.current['openapi-structure'] = el}
                    className="guide-section"
                >
                    <h2>Estructura básica</h2>
                    <p>Un archivo OpenAPI típico es simple pero potente. Aquí tienes la anatomía básica:</p>

                    <CodeBlock
                        language="json"
                        title="openapi.json"
                        code={`{
  "openapi": "3.0.0",
  "info": {
    "title": "Mi API Increíble",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Obtener usuarios",
        "responses": {
          "200": {
            "description": "Lista de usuarios exitosa"
          }
        }
      }
    }
  }
}`}
                    />
                </section>

                <section
                    id="nodejs-swagger-jsdoc"
                    ref={el => sectionRefs.current['nodejs-swagger-jsdoc'] = el}
                    className="guide-section"
                >
                    <h1><Server size={35} className='text-icon' /> Node.js / Express</h1>
                    <p className="lead-text">
                        Integra OpenAPI en tu aplicación Express fácilmente usando comentarios JSDoc. Tu código *es* tu documentación.
                    </p>

                    <h2>Paso a Paso</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Instalación</h3>
                                <p>Necesitas dos librerías clave: el generador (`swagger-jsdoc`) y la UI (`swagger-ui-express`).</p>
                                <CodeBlock language="bash" code={`npm install swagger-jsdoc swagger-ui-express`} />
                            </div>
                        </div>

                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Configuración del Server</h3>
                                <p>Inicializa la configuración en tu `server.js` o archivo principal.</p>
                                <CodeBlock language="javascript" title="server.js" code={`const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Mi API', version: '1.0.0' },
  },
  apis: ['./routes/*.js'], // ¡Importante! Dónde están tus rutas
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));`} />
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    id="nodejs-examples"
                    ref={el => sectionRefs.current['nodejs-examples'] = el}
                    className="guide-section"
                >
                    <h2>Ejemplos de Anotaciones</h2>
                    <p>Usa bloques de comentarios especiales encima de tus rutas:</p>

                    <CodeBlock
                        language="javascript"
                        title="routes/users.js"
                        code={`/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de usuarios recuperada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/users', async (req, res) => { ... });`}
                    />

                </section>

                {/* Python / FastAPI */}
                <section
                    id="python-setup"
                    ref={el => sectionRefs.current['python-setup'] = el}
                    className="guide-section"
                >
                    <h1><FileCode size={35} className='text-icon' /> Python / FastAPI</h1>
                    <p className="lead-text">
                        FastAPI fue diseñado *para* OpenAPI. No tienes que hacer nada extra, la documentación se genera sola analizando tus tipos de Python.
                    </p>

                    <h2>Como funciona</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Define tus Modelos (Pydantic)</h3>
                                <p>Crea clases que representen tus datos. Typing fuerte = Docs automáticos.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Escribe tus Rutas</h3>
                                <p>Usa los modelos como tipos de retorno y parámetros.</p>
                            </div>
                        </div>
                        <div className="step-item">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>¡Listo!</h3>
                                <p>FastAPI lee esos tipos y genera el JSON de OpenAPI mágicamente.</p>
                            </div>
                        </div>
                    </div>

                    <CodeBlock
                        language="python"
                        title="main.py"
                        code={`from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    id: int
    name: str

@app.post("/users", response_model=User)
async def create_user(user: User):
    return user`}
                    />

                    <div className="warning-box">
                        <h3>Acceso Rápido</h3>
                        <p>Tu documentación vive automáticamente en <code>/docs</code> (Swagger UI) y <code>/redoc</code> en tu servidor FastAPI.</p>
                    </div>
                </section>

                {/* Java / Spring Boot */}
                <section
                    id="java-springdoc"
                    ref={el => sectionRefs.current['java-springdoc'] = el}
                    className="guide-section"
                >
                    <h1><Coffee size={35} className='text-icon' /> Java / Spring Boot</h1>
                    <p>Usa la librería <code>springdoc-openapi</code> para integrar OpenAPI 3 en tus aplicaciones Spring Boot.</p>

                    <h2>Integración Rápida</h2>
                    <div className="steps-list">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Añadir Dependencia</h3>
                                <CodeBlock language="xml" code={`<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>`} />
                            </div>
                        </div>
                    </div>

                    <h3>Anotaciones</h3>
                    <CodeBlock
                        language="java"
                        title="UserController.java"
                        code={`@Tag(name = "Users", description = "API de usuarios")
public class UserController {

    @Operation(summary = "Obtener usuarios")
    @GetMapping("/users")
    public List<User> getUsers() { ... }
}`}
                    />
                </section>

                {/* Herramientas */}
                <section
                    id="tools-generators"
                    ref={el => sectionRefs.current['tools-generators'] = el}
                    className="guide-section"
                >
                    <h1><Wrench size={35} className='text-icon' /> Herramientas del Ecosistema</h1>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon"><Wrench size={30} className='text-icon' /></div>
                            <h3>Swagger Editor</h3>
                            <p>Editor visual oficial. Ideal para diseñar specs desde cero.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><Wrench size={30} className='text-icon' /></div>
                            <h3>Spectral</h3>
                            <p>Linter para OpenAPI. Asegura que tus specs sigan las reglas de estilo y calidad.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><Wrench size={30} className='text-icon' /></div>
                            <h3>OpenAPI Generator</h3>
                            <p>La navaja suiza. Genera clientes y servidores para casi cualquier lenguaje.</p>
                        </div>
                    </div>

                    <h2>Generación de Código CLI</h2>
                    <CodeBlock language="bash" code={`# Generar cliente React/Axios
openapi-generator-cli generate -i openapi.json -g typescript-axios -o ./api-client`} />
                </section>
            </main>
        </div>
    );
}

export default OpenApiGuidePage;
