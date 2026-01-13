# 📋 Informe de Práctica Profesional

## Información General

| Campo | Detalle |
|-------|---------|
| **Proyecto** | DocApp - Plataforma de Documentación Profesional |
| **Inicio estimado** | Lunes 15 de diciembre de 2025 |
| **Última actualización** | 13 de enero de 2026 |
| **Stack tecnológico** | React 19 + Express 5 + PostgreSQL 15 + Docker |

---

## 📊 Resumen del Proyecto

**DocApp** es un sistema completo de gestión de documentación técnica que incluye:
- Autenticación JWT con cookies HTTP-only
- Gestión de proyectos y documentos
- Editor Markdown con vista previa en tiempo real
- Visualizador OpenAPI/Swagger interactivo
- Análisis de repositorios Git (GitHub, GitLab, Bitbucket)
- Despliegue containerizado con Docker Compose

---

## 📅 Registro de Avances Semanales

---

### Semana 1 (15 - 21 de diciembre de 2025)

#### 🎯 Objetivos
- Inicialización del proyecto y configuración base

#### ✅ Logros
- **First commit** - Configuración inicial del proyecto con estructura base

#### 📝 Commits
| Fecha | Descripción |
|-------|-------------|
| 22/12/2025 | First commit - Estructura inicial del proyecto |

---

### Semana 2 (22 - 28 de diciembre de 2025)

#### 🎯 Objetivos
- Implementación de funcionalidades core del sistema
- Mejoras de interfaz de usuario

#### ✅ Logros
- Implementación de componentes de edición Markdown
- Configuración de proyectos y visibilidad

#### ⚠️ Dificultades Encontradas

1. **Ajuste de visibilidad de proyectos**
   - *Problema*: Los elementos en la página de "Gestión de Proyectos" no se mostraban correctamente
   - *Solución*: Revisión y ajuste de reglas CSS en `ProjectSelector.css` y modificaciones en componentes JavaScript (`ProjectSelector.js`, `ProjectsPage.js`)

2. **Bug en vinculación documento-proyecto**
   - *Problema*: Los documentos recién creados no se asociaban correctamente con los proyectos seleccionados
   - *Solución*: Validación de `project_id` tanto en frontend como en backend

3. **Mejoras de seguridad**
   - *Implementación*: Aplicación de `express-validator` para validación robusta de inputs
   - *Implementación*: `express-rate-limit` para protección contra ataques de fuerza bruta

#### 📝 Commits Relacionados
- Añadido MarkdownEditor y componentes relacionados
- Correcciones de bugs en vinculación de documentos
- Implementación de validación de inputs
- Configuración de rate limiting

---

### Semana 3 (29 de diciembre de 2025 - 4 de enero de 2026)

#### 🎯 Objetivos
- Implementación de paginación en backend y frontend
- Corrección de bugs en visor de APIs

#### ✅ Logros
- Paginación funcional en endpoints `GET /documents` y `GET /projects`
- Corrección del visor Swagger UI

#### ⚠️ Dificultades Encontradas

1. **Paginación de documentos y proyectos**
   - *Problema*: El servidor podía sobrecargarse al recuperar grandes cantidades de registros
   - *Solución*: Implementación de parámetros `page` y `limit` con `LIMIT` y `OFFSET` en SQL

2. **Bug en visor de API (Swagger UI)**
   - *Problema*: Las especificaciones API no se mostraban correctamente al acceder desde "Documents"
   - *Causa*: `NotFoundError` y errores de manipulación DOM en `OpenApiViewer`
   - *Solución*: 
     - Corrección de navegación del botón "Ver con Swagger" (ruta `/api-test?spec=ID`)
     - Debug y corrección de errores en componente `OpenApiViewer`

#### 📝 Commits Relacionados
- Implementación de paginación backend (LIMIT/OFFSET)
- Actualización de servicios API para enviar parámetros de paginación
- Integración de controles de paginación en UI
- Fix del componente OpenApiViewer

---

### Semana 4 (5 - 11 de enero de 2026)

#### 🎯 Objetivos
- Habilitación de acceso LAN para pruebas en red local
- Refactorización de código

#### ✅ Logros
- Configuración exitosa para acceso desde múltiples máquinas en LAN
- Refactorización de componentes frontend

#### ⚠️ Dificultades Encontradas

1. **Problemas de acceso LAN**
   - *Problema*: Otras máquinas en la red local no podían acceder a la aplicación ni realizar login/registro
   - *Causas identificadas*:
     - Configuración incorrecta de CORS para IPs de LAN
     - Atributos de cookies (`sameSite`, `secure`) no compatibles con HTTP en desarrollo
     - Server binding limitado (no escuchaba en `0.0.0.0`)
   - *Soluciones implementadas*:
     - Configuración de CORS para permitir requests desde IPs de LAN y localhost
     - Ajuste de cookies: `sameSite: 'lax'` y `secure: false` para entorno de desarrollo HTTP
     - Binding del servidor en `0.0.0.0` para aceptar conexiones externas
     - Verificación de configuración Docker (`docker-compose.yml`) para exposición correcta de puertos

#### 📝 Commits Relacionados
| Fecha | Descripción |
|-------|-------------|
| 13/01/2026 | feat: Centralización y refactorización de componentes |
| 13/01/2026 | feat: Ajustes de configuración para acceso LAN |

---

## 📈 Métricas de Progreso

### Funcionalidades Completadas ✅
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
- [x] Workspace unificado con sidebar navegable
- [x] Análisis de repositorios Git
- [x] Detección automática de frameworks
- [x] Generación automática de specs OpenAPI desde código
- [x] Historial de versiones para API specs
- [x] Acceso multi-dispositivo en LAN

### Funcionalidades Pendientes 📋
- [ ] Búsqueda full-text en contenido
- [ ] Versionado detallado de documentos
- [ ] Colaboración en tiempo real (WebSockets)
- [ ] Templates personalizados
- [ ] Sistema de permisos por proyecto

---

## 🔧 Tecnologías Aplicadas

### Backend
- Node.js + Express 5.x
- PostgreSQL 15
- JWT para autenticación
- Bcrypt para cifrado
- Helmet.js para seguridad
- Express-validator para validación
- Express-rate-limit para protección

### Frontend
- React 19
- React Router DOM 6
- Axios para HTTP
- React Markdown + Syntax Highlighter
- @react-pdf/renderer

### DevOps
- Docker & Docker Compose
- Hot Reload configurado
- Variables de entorno gestionadas

---

## 📝 Notas y Observaciones

*Esta sección puede utilizarse para agregar notas adicionales durante las revisiones semanales.*

---

**Documento generado automáticamente - Última actualización: 13 de enero de 2026**
