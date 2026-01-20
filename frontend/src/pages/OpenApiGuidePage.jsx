import React, { useState, useRef, useEffect } from 'react';
import GuideSidebar from '../components/GuideSidebar';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/OpenApiGuidePage.css';
import '../styles/MarkdownRenderer.css';
import '../styles/CodeBlockOverrides.css';

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
        <div className="openapi-guide-page">
            <GuideSidebar activeSection={activeSection} onNavigate={handleNavigate} />

            <main className="guide-content">
                {/* Introducción */}
                <section
                    id="what-is-openapi"
                    ref={el => sectionRefs.current['what-is-openapi'] = el}
                    className="guide-section"
                >
                    <h1>¿Qué es OpenAPI?</h1>
                    <p>
                        OpenAPI (anteriormente conocido como Swagger) es una <strong>especificación estándar</strong> para
                        describir APIs RESTful de manera legible tanto para humanos como para máquinas.
                    </p>

                    <div className="info-box">
                        <h3>🎯 Características principales</h3>
                        <ul>
                            <li>📝 Documentación automática e interactiva</li>
                            <li>🔄 Generación de código cliente y servidor</li>
                            <li>✅ Validación de peticiones y respuestas</li>
                            <li>🧪 Testing de APIs simplificado</li>
                            <li>🤝 Contrato entre frontend y backend</li>
                        </ul>
                    </div>
                </section>

                <section
                    id="why-use-openapi"
                    ref={el => sectionRefs.current['why-use-openapi'] = el}
                    className="guide-section"
                >
                    <h2>¿Por qué usar OpenAPI?</h2>

                    <div className="benefits-grid">
                        <div className="benefit-card">
                            <div className="benefit-icon">📚</div>
                            <h3>Documentación siempre actualizada</h3>
                            <p>La documentación se genera automáticamente desde tu código</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">⚡</div>
                            <h3>Desarrollo más rápido</h3>
                            <p>Genera código cliente automáticamente para cualquier lenguaje</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">🎯</div>
                            <h3>Menos errores</h3>
                            <p>Valida requests y responses contra la especificación</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">🤝</div>
                            <h3>Mejor colaboración</h3>
                            <p>Frontend y backend trabajan con un contrato claro</p>
                        </div>
                    </div>
                </section>

                <section
                    id="openapi-structure"
                    ref={el => sectionRefs.current['openapi-structure'] = el}
                    className="guide-section"
                >
                    <h2>Estructura básica</h2>
                    <p>Un archivo OpenAPI típico contiene:</p>

                    <CodeBlock
                        language="json"
                        title="openapi.json"
                        code={`{
  "openapi": "3.0.0",
  "info": {
    "title": "Mi API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Obtener usuarios",
        "responses": {
          "200": {
            "description": "Lista de usuarios"
          }
        }
      }
    }
  }
}`}
                    />
                </section>

                {/* Node.js / Express */}
                <section
                    id="nodejs-swagger-jsdoc"
                    ref={el => sectionRefs.current['nodejs-swagger-jsdoc'] = el}
                    className="guide-section"
                >
                    <h1>🟢 Node.js / Express</h1>
                    <h2>Usando swagger-jsdoc</h2>

                    <p>
                        <code>swagger-jsdoc</code> genera especificaciones OpenAPI desde comentarios JSDoc en tu código.
                    </p>

                    <h3>1. Instalación</h3>
                    <CodeBlock
                        language="bash"
                        code={`npm install swagger-jsdoc swagger-ui-express`}
                    />

                    <h3>2. Configuración del servidor</h3>
                    <CodeBlock
                        language="javascript"
                        title="server.js"
                        code={`const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mi API',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.js'], // Archivos con anotaciones
};

const swaggerSpec = swaggerJsdoc(options);

// Servir UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoint para JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});`}
                    />
                </section>

                <section
                    id="nodejs-examples"
                    ref={el => sectionRefs.current['nodejs-examples'] = el}
                    className="guide-section"
                >
                    <h2>Ejemplos de anotaciones</h2>

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
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/users', async (req, res) => {
  // Lógica aquí
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 */`}
                    />
                </section>

                <section
                    id="nodejs-export"
                    ref={el => sectionRefs.current['nodejs-export'] = el}
                    className="guide-section"
                >
                    <h2>Exportar archivo JSON</h2>
                    <p>Para obtener el archivo <code>openapi.json</code>:</p>

                    <CodeBlock
                        language="bash"
                        code={`curl http://localhost:5000/api-docs.json > openapi.json`}
                    />

                    <p>O visita <code>http://localhost:5000/api-docs</code> para ver la UI interactiva.</p>
                </section>

                {/* Python / FastAPI */}
                <section
                    id="python-setup"
                    ref={el => sectionRefs.current['python-setup'] = el}
                    className="guide-section"
                >
                    <h1>🐍 Python / FastAPI</h1>
                    <h2>Configuración inicial</h2>

                    <p>FastAPI genera OpenAPI <strong>automáticamente</strong>. No necesitas configuración extra.</p>

                    <h3>Instalación</h3>
                    <CodeBlock
                        language="bash"
                        code={`pip install fastapi uvicorn`}
                    />
                </section>

                <section
                    id="python-automatic"
                    ref={el => sectionRefs.current['python-automatic'] = el}
                    className="guide-section"
                >
                    <h2>Generación automática</h2>

                    <CodeBlock
                        language="python"
                        title="main.py"
                        code={`from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="Mi API",
    description="Descripción de la API",
    version="1.0.0"
)

class User(BaseModel):
    id: int
    name: str
    email: str

@app.get("/users", response_model=list[User], tags=["Users"])
async def get_users():
    """Obtener todos los usuarios"""
    return [
        {"id": 1, "name": "Juan", "email": "juan@example.com"}
    ]

@app.post("/users", response_model=User, tags=["Users"])
async def create_user(user: User):
    """Crear un nuevo usuario"""
    return user`}
                    />

                    <p>¡Eso es todo! FastAPI genera la especificación OpenAPI automáticamente.</p>
                </section>

                <section
                    id="python-download"
                    ref={el => sectionRefs.current['python-download'] = el}
                    className="guide-section"
                >
                    <h2>Descargar especificación</h2>

                    <div className="info-box">
                        <h3>Rutas disponibles</h3>
                        <ul>
                            <li><code>/docs</code> - Documentación interactiva (Swagger UI)</li>
                            <li><code>/openapi.json</code> - Archivo JSON de la especificación</li>
                            <li><code>/redoc</code> - Documentación alternativa (ReDoc)</li>
                        </ul>
                    </div>

                    <CodeBlock
                        language="bash"
                        code={`curl http://localhost:8000/openapi.json > openapi.json`}
                    />
                </section>

                {/* Java / Spring Boot */}
                <section
                    id="java-springdoc"
                    ref={el => sectionRefs.current['java-springdoc'] = el}
                    className="guide-section"
                >
                    <h1>☕ Java / Spring Boot</h1>
                    <h2>Springdoc OpenAPI</h2>

                    <h3>Añadir dependencia (Maven)</h3>
                    <CodeBlock
                        language="xml"
                        title="pom.xml"
                        code={`<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>`}
                    />
                </section>

                <section
                    id="java-annotations"
                    ref={el => sectionRefs.current['java-annotations'] = el}
                    className="guide-section"
                >
                    <h2>Usar anotaciones</h2>

                    <CodeBlock
                        language="java"
                        title="UserController.java"
                        code={`@RestController
@RequestMapping("/users")
@Tag(name = "Users", description = "API de usuarios")
public class UserController {

    @GetMapping
    @Operation(summary = "Obtener usuarios")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", 
                     description = "Lista obtenida",
                     content = @Content(schema = @Schema(implementation = User.class)))
    })
    public List<User> getUsers() {
        return userService.findAll();
    }
}`}
                    />
                </section>

                <section
                    id="java-access"
                    ref={el => sectionRefs.current['java-access'] = el}
                    className="guide-section"
                >
                    <h2>Acceder a la documentación</h2>

                    <div className="info-box">
                        <h3>Rutas disponibles</h3>
                        <ul>
                            <li><code>http://localhost:8080/swagger-ui.html</code> - Swagger UI</li>
                            <li><code>http://localhost:8080/v3/api-docs</code> - JSON</li>
                        </ul>
                    </div>
                </section>

                {/* .NET / ASP.NET Core */}
                <section
                    id="dotnet-swashbuckle"
                    ref={el => sectionRefs.current['dotnet-swashbuckle'] = el}
                    className="guide-section"
                >
                    <h1>🔷 .NET / ASP.NET Core</h1>
                    <h2>Swashbuckle</h2>

                    <h3>Instalar NuGet</h3>
                    <CodeBlock
                        language="bash"
                        code={`dotnet add package Swashbuckle.AspNetCore`}
                    />
                </section>

                <section
                    id="dotnet-config"
                    ref={el => sectionRefs.current['dotnet-config'] = el}
                    className="guide-section"
                >
                    <h2>Configuración</h2>

                    <CodeBlock
                        language="csharp"
                        title="Program.cs"
                        code={`var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Mi API",
        Version = "v1"
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();
app.Run();`}
                    />
                </section>

                <section
                    id="dotnet-endpoints"
                    ref={el => sectionRefs.current['dotnet-endpoints'] = el}
                    className="guide-section"
                >
                    <h2>Documentar endpoints</h2>

                    <CodeBlock
                        language="csharp"
                        title="UsersController.cs"
                        code={`[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    /// <summary>
    /// Obtener todos los usuarios
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<User>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<User>> GetUsers()
    {
        return Ok(users);
    }
}`}
                    />

                    <p>Accede a <code>https://localhost:5001/swagger</code></p>
                </section>

                {/* Herramientas */}
                <section
                    id="tools-editors"
                    ref={el => sectionRefs.current['tools-editors'] = el}
                    className="guide-section"
                >
                    <h1>🛠️ Herramientas útiles</h1>
                    <h2>Editores online</h2>

                    <div className="tools-grid">
                        <div className="tool-card">
                            <h3>Swagger Editor</h3>
                            <p>Editor oficial de OpenAPI</p>
                            <a href="https://editor.swagger.io" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-small">
                                Visitar →
                            </a>
                        </div>

                        <div className="tool-card">
                            <h3>Stoplight Studio</h3>
                            <p>Editor visual avanzado</p>
                            <a href="https://stoplight.io/studio" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-small">
                                Visitar →
                            </a>
                        </div>
                    </div>
                </section>

                <section
                    id="tools-validators"
                    ref={el => sectionRefs.current['tools-validators'] = el}
                    className="guide-section"
                >
                    <h2>Validadores</h2>

                    <CodeBlock
                        language="bash"
                        code={`# Swagger Parser
npm install -g @apidevtools/swagger-parser
swagger-parser validate openapi.json

# Spectral (Linter)
npm install -g @stoplight/spectral-cli
spectral lint openapi.json`}
                    />
                </section>

                <section
                    id="tools-generators"
                    ref={el => sectionRefs.current['tools-generators'] = el}
                    className="guide-section"
                >
                    <h2>Generadores de código</h2>

                    <p>OpenAPI Generator puede crear código cliente en cualquier lenguaje:</p>

                    <CodeBlock
                        language="bash"
                        code={`npm install -g @openapitools/openapi-generator-cli

# Generar cliente JavaScript
openapi-generator-cli generate \\
  -i openapi.json \\
  -g javascript \\
  -o ./client

# Lenguajes soportados: javascript, typescript-axios, 
# python, java, csharp, go, php, ruby, y más...`}
                    />
                </section>

                <div className="guide-footer">
                    <h2>¿Necesitas más ayuda?</h2>
                    <p>
                        Consulta la <a href="https://swagger.io/specification/" target="_blank" rel="noopener noreferrer">especificación oficial de OpenAPI</a> o
                        explora <a href="https://github.com/OAI/OpenAPI-Specification" target="_blank" rel="noopener noreferrer">ejemplos en GitHub</a>.
                    </p>
                </div>
            </main>
        </div>
    );
}

export default OpenApiGuidePage;
