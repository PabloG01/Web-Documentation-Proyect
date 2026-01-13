# 📚 DocApp - Plataforma de Documentación Profesional

Sistema completo de gestión de documentación técnica con arquitectura cliente-servidor, autenticación JWT, y despliegue con Docker.

## ✨ Características Principales

### 🔐 **Autenticación y Seguridad**
- Sistema de registro e inicio de sesión con JWT
- Tokens HTTP-only para máxima seguridad
- Rate limiting en endpoints de API
- Protección con Helmet.js y CORS configurado
- Validación de datos con express-validator
- Cifrado de contraseñas con bcrypt

### 📁 **Gestión de Proyectos**
- Creación de proyectos con códigos únicos (ej: PRY-001, API-2024)
- Organización de documentos por proyecto
- Códigos de color personalizados para identificación rápida
- Conteo automático de documentos por proyecto
- Operaciones CRUD completas

### 📄 **Tipos de Documentación**
- 🔌 **API** - Documentación de endpoints y APIs REST
- 👤 **Manual de Usuario** - Guías para usuarios finales
- ⚙️ **Técnica** - Arquitectura y especificaciones técnicas
- 📊 **Procesos** - Flujos de procesos de negocio
- 📋 **Proyecto** - Resúmenes ejecutivos y objetivos
- ✅ **Requisitos** - Especificación de requerimientos

### 🔍 **Búsqueda y Filtros Avanzados**
- Búsqueda por título y descripción
- Filtrado por tipo de documentación
- Filtrado por proyecto
- Paginación optimizada (backend con LIMIT/OFFSET)
- Selector de items por página (10, 20, 50, 100)
- Navegación rápida entre páginas

### ✏️ **Editor Markdown Completo**
- Editor con vista previa en tiempo real
- Renderizado Markdown con react-markdown
- Resaltado de sintaxis para bloques de código
- Soporte para GitHub Flavored Markdown (GFM)
- Tabla de contenidos automática
- Exportación a PDF con @react-pdf/renderer
- Modo edición inline
- Control de versiones

### 📊 **Especificaciones OpenAPI**
- Visualizador interactivo de especificaciones OpenAPI 3.0
- **Parseo de comentarios Swagger desde archivos JavaScript**
- Navegación por tags, paths, endpoints y schemas
- Testing de APIs directamente desde la interfaz
- Importación y almacenamiento de specs
- **Editor avanzado de endpoints en tiempo real**
- **Historial de versiones con restauración**
- **Puntuación de calidad con sugerencias de mejora**
- Guía completa de implementación incluida

### 🔗 **Análisis de Repositorios Git**
- Conexión a repositorios GitHub, GitLab y Bitbucket
- **Detección automática de frameworks** (Express, NestJS, Laravel, Symfony, FastAPI, Flask, Next.js, Fastify, Koa, Hapi)
- **Parsers especializados por framework**
- Extracción automática de endpoints y rutas
- Generación de especificaciones OpenAPI desde código
- Soporte para repositorios privados con tokens de acceso
- Re-sincronización de repositorios

### 🏠 **Workspace Unificado**
- Dashboard centralizado con navegación por secciones
- Sidebar colapsable con estadísticas en tiempo real
- Secciones: Proyectos, Documentos, APIs, Repositorios
- Navegación fluida entre componentes

### 🚀 **API REST con Swagger**
- Documentación automática con Swagger UI
- Endpoint `/api-docs` con interfaz interactiva
- Especificación OpenAPI 3.0 descargable
- Endpoints RESTful bien estructurados

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** - Runtime JavaScript
- **Express 5.x** - Framework web
- **PostgreSQL 15** - Base de datos relacional
- **JWT** - Autenticación basada en tokens
- **Bcrypt** - Cifrado de contraseñas
- **Swagger** - Documentación de API (swagger-jsdoc, swagger-ui-express)
- **Helmet** - Seguridad HTTP headers
- **Express Rate Limit** - Protección contra abuso
- **Express Validator** - Validación de datos

### Frontend
- **React 19** - Biblioteca UI
- **React Router DOM 6** - Navegación SPA
- **Axios** - Cliente HTTP
- **React Markdown** - Renderizado Markdown
- **React Syntax Highlighter** - Resaltado de código
- **@react-pdf/renderer** - Generación de PDFs
- **Prism React Renderer** - Temas de sintaxis
- **Remark GFM** - GitHub Flavored Markdown
- **Rehype Sanitize** - Sanitización HTML

### DevOps
- **Docker & Docker Compose** - Contenedorización
- **PostgreSQL** - Persistencia en volúmenes Docker
- **Node 22 Alpine** - Imágenes base ligeras
- **Hot Reload** - Desarrollo con volúmenes montados

## 🚀 Instalación y Despliegue

### Opción 1: Docker (Recomendado)

#### Prerrequisitos
- Docker Desktop instalado
- Docker Compose instalado

#### Instrucciar
```bash
# 1. Clonar el repositorio
git clone <url-repositorio>
cd Web-Documentation-Proyect

# 2. Construir e iniciar todos los servicios
docker-compose up --build

# 3. Acceder a la aplicación
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Swagger Docs: http://localhost:5000/api-docs
```

#### Detener servicios
```bash
# Detener contenedores
docker-compose down

# Detener y eliminar volúmenes (⚠️ borra datos)
docker-compose down -v
```

#### Servicios Docker
El archivo `docker-compose.yml` define 3 servicios:

1. **docapp-db** (PostgreSQL 15)
   - Puerto interno: 5432
   - Volumen persistente: `postgres_data`
   - Healthcheck: verificación cada 5 segundos

2. **docapp-backend** (Node.js API)
   - Puerto: `5000:5000`
   - Hot reload habilitado
   - Espera a que DB esté saludable antes de iniciar

3. **docapp-frontend** (React App)
   - Puerto: `3000:3000`
   - Hot reload habilitado
   - Polling activado para detección de cambios

### Opción 2: Desarrollo Local

#### Prerrequisitos
- Node.js 18+ 
- npm 8+
- PostgreSQL 15+ instalado localmente

#### Backend
```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env .env
# Editar .env con tus credenciales de PostgreSQL

# Iniciar servidor de desarrollo
npm run dev

# O modo producción
npm start
```

#### Frontend
```bash
cd frontend

# Instalar dependencias
npm install --legacy-peer-deps

# Iniciar servidor de desarrollo
npm start

# Build de producción
npm run build
```

## 📂 Estructura del Proyecto

```
Web-Documentation-Proyect/
├── backend/
│   ├── routes/
│   │   ├── auth.js                 # Autenticación (login, register, /me)
│   │   ├── projects.js             # CRUD proyectos con paginación
│   │   ├── documents.js            # CRUD documentos con paginación
│   │   └── api-specs.js            # CRUD especificaciones OpenAPI
│   ├── middleware/
│   │   ├── errorHandler.js         # Manejo centralizado de errores
│   │   ├── rateLimiter.js          # Rate limiting por IP
│   │   └── validators.js           # Validaciones con express-validator
│   ├── database.js                 # Conexión PostgreSQL + inicialización
│   ├── server.js                   # Configuración Express + Swagger
│   ├── Dockerfile                  # Imagen Docker backend
│   ├── package.json
│   └── env                         # Plantilla variables de entorno
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js           # Navegación principal
│   │   │   ├── DocumentCard.js     # Tarjeta de documento
│   │   │   ├── DocumentForm.js     # Formulario crear/editar
│   │   │   ├── MarkdownEditor.js   # Editor con vista previa
│   │   │   ├── MarkdownRenderer.js # Renderizador MD
│   │   │   ├── MarkdownToPdf.js    # Exportador PDF
│   │   │   ├── OpenApiViewer.js    # Visor OpenAPI dinámico
│   │   │   ├── Pagination.js       # Controles de paginación
│   │   │   ├── ProjectSelector.js  # Selector de proyectos
│   │   │   ├── SpecEditor.js       # Editor avanzado de endpoints
│   │   │   ├── VersionHistory.js   # Historial de versiones
│   │   │   ├── ScoreBreakdown.js   # Puntuación de calidad
│   │   │   ├── EndpointPreview.js  # Vista previa de endpoints
│   │   │   ├── GitHubConnect.js    # Conexión OAuth GitHub
│   │   │   ├── BitbucketConnect.js # Conexión OAuth Bitbucket
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── HomePage.js         # Página de inicio
│   │   │   ├── LoginPage.js        # Inicio de sesión
│   │   │   ├── RegisterPage.js     # Registro de usuario
│   │   │   ├── CreatePage.js       # Creación guiada de documentos
│   │   │   ├── DocumentsListPage.js # Lista con tabs y paginación
│   │   │   ├── DocumentViewPage.js # Vista/edición documento
│   │   │   ├── ProjectsPage.js     # Gestión proyectos con edición inline
│   │   │   ├── ApiTestPage.js      # Testing y edición de APIs
│   │   │   ├── WorkspacePage.js    # Dashboard unificado
│   │   │   ├── ReposPage.js        # Análisis de repositorios
│   │   │   └── OpenApiGuidePage.js # Guía de OpenAPI
│   │   ├── context/
│   │   │   └── AuthContext.js      # Contexto de autenticación
│   │   ├── services/
│   │   │   └── api.js              # Cliente Axios con interceptors
│   │   ├── styles/                 # Archivos CSS modulares
│   │   ├── App.js                  # Rutas y providers
│   │   └── index.js                # Punto de entrada
│   ├── Dockerfile                  # Imagen Docker frontend
│   └── config-overrides.js         # Configuración webpack
├── Docker-compose.yml              # Orquestación de servicios
├── PAGINATION_GUIDE.md             # Guía de implementación paginación
├── OPENAPI_GUIDE.md                # Guía de OpenAPI
├── DONDE_VAN_ANOTACIONES.md        # Documentación interna
└── README.md                       # Este archivo
```

## 💾 Base de Datos

### Esquema PostgreSQL

#### Tabla: `users`
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `projects`
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `documents`
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    content TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    author VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `api_specs`
```sql
CREATE TABLE api_specs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    spec_content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inicialización Automática
Las tablas se crean automáticamente al iniciar el backend mediante la función `initializeDatabase()` con:
- Mecanismo de reintentos (10 intentos)
- Espera hasta que PostgreSQL esté listo
- Logs informativos del proceso

## 🔌 API Endpoints

### Autenticación
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión (retorna token)
- `GET /auth/me` - Obtener usuario actual (requiere token)
- `POST /auth/logout` - Cerrar sesión

### Proyectos
- `GET /projects` - Listar proyectos (con paginación)
- `GET /projects/:id` - Obtener proyecto específico
- `POST /projects` - Crear proyecto
- `PUT /projects/:id` - Actualizar proyecto
- `DELETE /projects/:id` - Eliminar proyecto

### Documentos
- `GET /documents` - Listar documentos (con paginación y filtros)
- `GET /documents/:id` - Obtener documento específico
- `POST /documents` - Crear documento
- `PUT /documents/:id` - Actualizar documento
- `DELETE /documents/:id` - Eliminar documento

### API Specs
- `GET /api-specs` - Listar especificaciones OpenAPI
- `GET /api-specs/:id` - Obtener especificación específica
- `POST /api-specs` - Crear especificación
- `POST /api-specs/parse-swagger` - Parsear archivo JS con comentarios Swagger
- `PUT /api-specs/:id` - Actualizar especificación
- `DELETE /api-specs/:id` - Eliminar especificación
- `GET /api-specs/:id/versions` - Obtener historial de versiones
- `GET /api-specs/:id/versions/:versionId` - Obtener versión específica
- `POST /api-specs/:id/versions/:versionId/restore` - Restaurar versión anterior

### Repositorios Git
- `POST /repos/analyze` - Analizar repositorio Git
- `GET /repos` - Listar repositorios conectados
- `GET /repos/:id` - Obtener detalles de repositorio con archivos
- `POST /repos/:repoId/files/:fileId/generate-spec` - Generar spec desde archivo
- `POST /repos/:id/resync` - Re-sincronizar repositorio
- `DELETE /repos/:id` - Eliminar conexión de repositorio

### OAuth (GitHub/Bitbucket)
- `GET /github/auth` - Iniciar OAuth con GitHub
- `GET /github/callback` - Callback de GitHub
- `GET /github/status` - Estado de conexión GitHub
- `GET /github/repos` - Listar repositorios del usuario
- `POST /github/disconnect` - Desconectar cuenta GitHub
- (Endpoints equivalentes para Bitbucket en `/bitbucket/*`)

### Documentación
- `GET /api-docs` - Swagger UI interactiva
- `GET /api-docs.json` - Especificación OpenAPI en JSON

## 🎯 Flujo de Uso

### 1. Registro e Inicio de Sesión
1. Crear cuenta en `/register`
2. Iniciar sesión en `/login`
3. Token JWT se almacena automáticamente

### 2. Crear un Proyecto
1. Ir a **Proyectos** → **Nuevo Proyecto**
2. Asignar código, nombre, descripción y color
3. Guardar proyecto

### 3. Crear Documentación
1. Ir a **Crear** en el menú
2. **Si no hay proyectos**: Se muestra formulario para crear el primer proyecto
3. **Si hay proyectos**: Elegir entre crear proyecto o documento
4. Seleccionar proyecto (si se crea documento)
5. Elegir tipo de documentación
6. Completar formulario con plantilla predefinida
7. Editar contenido en Markdown
8. Vista previa en tiempo real
9. Guardar documento

### 4. Gestionar Documentos
1. Ir a **Mis Documentos**
2. Filtrar por proyecto o tipo
3. Navegar con paginación
4. Editar, visualizar o eliminar documentos
5. Exportar a PDF si es necesario

### 5. API Testing
1. Ir a **API Testing**
2. Importar especificación OpenAPI
3. Visualizar endpoints organizados
4. Probar llamadas a la API
5. Ver respuestas en tiempo real

## 📋 Scripts Disponibles

### Backend (`backend/`)
```bash
npm start      # Inicia servidor en modo producción
npm run dev    # Inicia con nodemon (hot reload)
```

### Frontend (`frontend/`)
```bash
npm start      # Servidor de desarrollo (puerto 3000)
npm run build  # Build optimizado para producción
npm test       # Ejecutar tests
```

### Docker
```bash
docker-compose up          # Iniciar servicios
docker-compose up --build  # Reconstruir e iniciar
docker-compose down        # Detener servicios
docker-compose down -v     # Detener y eliminar datos
docker-compose logs -f     # Ver logs en tiempo real
```

## 🎨 Características de UI

### Tema Claro
La aplicación utiliza un tema claro moderno con los siguientes colores:

### Paleta de Colores
- **Primary**: `#6366f1` (Índigo)
- **Secondary**: `#8b5cf6` (Violeta)
- **Accent**: `#ec4899` (Rosa)
- **Background**: `#f8fafc` (Gris claro)
- **Surface**: `#ffffff` (Blanco)
- **Success**: `#10b981` (Verde)
- **Warning**: `#f59e0b` (Naranja)
- **Danger**: `#ef4444` (Rojo)

### Diseño Responsivo
- Mobile-first design
- Breakpoints adaptables
- Navegación optimizada para pantallas pequeñas

### Componentes Interactivos
- Tarjetas con hover effects
- Modales para confirmación
- Tooltips informativos
- Loading states
- Mensajes de error/éxito

## 🔒 Seguridad

### Implementadas
- ✅ Autenticación JWT con HTTP-only cookies
- ✅ Bcrypt para hash de contraseñas (salt rounds: 10)
- ✅ Rate limiting (100 req/15min por IP)
- ✅ Helmet.js para headers de seguridad
- ✅ CORS configurado
- ✅ Validación y sanitización de inputs
- ✅ Protección contra inyección SQL (queries parametrizadas)
- ✅ Limite de tamaño de payload (1MB)
- ✅ Variables de entorno para secretos

### Recomendaciones de Producción
- [ ] Configurar HTTPS/TLS
- [ ] Variables de entorno en archivo .env (no en código)
- [ ] Rotar JWT_SECRET periódicamente
- [ ] Configurar CORS para dominios específicos
- [ ] Implementar refresh tokens
- [ ] Agregar logging centralizado
- [ ] Monitoreo de errores (ej: Sentry)

## 🚧 Roadmap

### ✅ Implementado
- [x] Sistema de autenticación JWT completo
- [x] Base de datos PostgreSQL con migraciones automáticas
- [x] Paginación en backend y frontend
- [x] Rate limiting y validaciones
- [x] Documentación Swagger automática
- [x] Editor Markdown con vista previa
- [x] Exportación a PDF
- [x] Visualizador OpenAPI interactivo
- [x] Despliegue con Docker Compose
- [x] Hot reload en desarrollo
- [x] Manejo de errores centralizado
- [x] **Workspace unificado con sidebar navegable**
- [x] **Análisis de repositorios Git (GitHub, GitLab, Bitbucket)**
- [x] **Detección automática de frameworks** (Express, NestJS, Laravel, Symfony, FastAPI, Flask, Next.js, etc.)
- [x] **Parsers especializados por framework**
- [x] **Generación automática de specs OpenAPI desde código**
- [x] **Historial de versiones para API specs**
- [x] **Editor avanzado de endpoints con sugerencias**
- [x] **Puntuación de calidad de especificaciones**
- [x] **OAuth con GitHub y Bitbucket**
- [x] **Flujo guiado de creación de proyectos/documentos**

### 📋 Próximas Funcionalidades
- [ ] Búsqueda full-text en contenido de documentos
- [ ] Versionado detallado de documentos (historial)
- [ ] Colaboración en tiempo real (WebSockets)
- [ ] Templates personalizados por usuario
- [ ] Tags y categorías personalizadas
- [ ] Notificaciones en tiempo real
- [ ] Sistema de permisos por proyecto
- [ ] Comentarios en documentos
- [ ] Exportación a más formatos (Word, HTML)
- [ ] Dashboard con estadísticas avanzadas
- [ ] API pública con rate limiting por usuario
- [ ] Soporte para más frameworks (Django, Spring Boot, etc.)

## 📚 Guías Adicionales

- [Guía de Paginación](PAGINATION_GUIDE.md) - Implementación detallada de paginación
- [Guía de OpenAPI](OPENAPI_GUIDE.md) - Cómo generar especificaciones OpenAPI
- [Anotaciones del Proyecto](DONDE_VAN_ANOTACIONES.md) - Documentación interna

## 🐛 Troubleshooting

### Error: "relation users does not exist"
**Solución**: Reiniciar contenedores para crear tablas
```bash
docker-compose down -v
docker-compose up --build
```

### Frontend no se conecta al backend
**Verificar**:
- Backend corriendo en puerto 5000
- CORS configurado correctamente
- Variables de entorno en frontend

### Hot reload no funciona en Docker
**Solución**: Ya configurado con `WATCHPACK_POLLING=true` y volúmenes montados

### Error de permisos en PostgreSQL
**Verificar**: Credenciales en `docker-compose.yml` y variables de entorno del backend

## 📝 Variables de Entorno

### Backend (`.env`)
```bash
# Database
DB_USER=postgres
DB_PASSWORD=usu2020
DB_DATABASE=docapp_db
DB_HOST=localhost  # o "db" en Docker
DB_PORT=5432

# Server
PORT=5000

# Security
JWT_SECRET=tu_clave_secreta_super_segura_aqui
```

### Frontend
El frontend usa `window.location.hostname` dinámicamente para conectarse al backend, facilitando el despliegue en diferentes entornos.

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👥 Contribución

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 👤 Autor

Desarrollado como proyecto de demostración de arquitectura fullstack moderna.

## 🙏 Agradecimientos

- React team por React 19
- Express.js community
- PostgreSQL contributors
- Swagger/OpenAPI initiative

---

**Última actualización**: Enero 2026
