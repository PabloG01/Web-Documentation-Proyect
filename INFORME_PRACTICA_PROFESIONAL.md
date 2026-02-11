# 📋 Informe de Práctica Profesional

## Información General

| Campo | Detalle |
|-------|---------|
| **Proyecto** | DocApp - Plataforma de Documentación Profesional |
| **Inicio estimado** | Lunes 15 de diciembre de 2025 |
| **Última actualización** | 11 de febrero de 2026 |
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

### Semana 5 (12 - 16 de enero de 2026)

#### 🎯 Objetivos
- Mejorar la precisión y contexto de la IA para generación de ejemplos
- Automatizar convenciones de nomenclatura para especificaciones API
- Establecer reporte periódico de avances

#### ✅ Logros
- Enriquecimiento de contexto para IA: Inclusión de `package.json`, estructura de directorios y detección de modelos
- Automatización de nombres de API Specs (sufijo de proyecto autogenerado)
- Creación de este informe de práctica profesional

#### ⚠️ Dificultades Encontradas

1. **Precisión de ejemplos generados por IA**
   - *Problema*: La IA generaba ejemplos genéricos desconectados de los modelos de datos reales del código.
   - *Solución*: Implementación de `getProjectContext` y mejora en `repo-analyzer.js` para identificar modelos/entidades y pasarlos como contexto prioritario al prompt de Gemini.

2. **Consistencia en nomenclatura de Specs**
   - *Problema*: Dificultad para identificar a qué proyecto pertenecía una spec en la lista global.
   - *Solución*: Lógica de renombrado automático que añade la extensión del proyecto al nombre de la spec al momento de su creación.

#### 📝 Commits Relacionados
- feat: Mejora de contexto para IA (estructura de proyecto y modelos)
- feat: Actualización automática de nombres de API specs
- docs: Creación y primera actualización de INFORME_PRACTICA_PROFESIONAL.md

---

### Semana 6 (19 - 25 de enero de 2026)

#### 🎯 Objetivos
- Mejorar la experiencia de usuario (UX) en la creación de proyectos y visualización de APIs
- Implementar un sistema de guías de usuario más robusto
- Resolver errores visuales y de flujo lógico

#### ✅ Logros
- **Mejora en API Tester**: Reorganización horizontal de filtros y diseño "premium" para selectores
- **Flujo de Creación**: Vinculación obligatoria de proyectos a entornos y corrección de botones de creación
- **Sistema de Guías**: Implementación de selector centralizado de guías y nueva documentación de uso de la app
- **Correcciones UI**: Alineación vertical correcta en cajas de información y alertas

#### ⚠️ Dificultades Encontradas

1. **Flujo de Proyectos sin Entorno**
   - *Problema*: Era posible crear proyectos sin vincularlos a un entorno, lo que rompía la lógica de organización.
   - *Solución*: Modificación de `CreatePage.jsx` para exigir selección de entorno y redirección si no existen entornos creados.

2. **Alineación de Contenido Markdown**
   - *Problema*: Listas dentro de cajas de información (`info-box`) se renderizaban horizontalmente.
   - *Solución*: Ajustes CSS específicos para forzar alineación vertical y limpieza de estilos heredados.

#### 📝 Commits Relacionados
- feat: Mejora de layout en API Tester (filtros horizontales)
- feat: Vinculación de nuevos proyectos a entornos
- feat: Nuevo sistema de navegación de guías
- fix: Alineación CSS en componentes de documentación

---

### Semana 7 (26 - 30 de enero de 2026)

#### 🎯 Objetivos
- Estabilizar la persistencia de filtros en la interfaz
- Refactorización de componentes críticos de navegación
- Implementación de actualizaciones en tiempo real (Socket.IO)
- Integración completa de GitHub OAuth (Connect/Disconnect)
- Rediseño y estandarización visual de Guías (App & OpenAPI)

#### ✅ Logros
- **Persistencia de Filtros**: Solución definitiva al reseteo automático de filtros en `WorkspacePage`
- **Gestión de API Keys**: 
  - Implementación de fallback para copiado en portapapeles (compatible con conexiones HTTP/LAN)
  - Corrección de base de datos (tabla `api_key_usage_logs` faltante)
- **Real-Time Features**: Integración de `Socket.IO` para actualización en vivo de contadores de uso de API Keys sin recargar la página.
- **GitHub OAuth (Implementado y Retirado)**: Se completó la integración full-stack del flujo de autenticación y vinculación de cuentas. *Nota: Funcionalidad posteriormente retirada por decisión de seguridad.*
- **UI/UX Guías (Overhaul)**:
  - **Estandarización**: Unificación visual completa entre *App Guide* y *OpenAPI Guide* (Paleta clara, layout centrado).
  - **Navegación**: Refactorización de sidebars a listas planas (sin acordeones) para acceso rápido.
  - **Contenido**: Reestructuración de la Guía de Aplicación (Nueva sección "Flujo de Trabajo", iconos `lucide-react` consistentes).

#### ⚠️ Dificultades Encontradas

1. **Decisión de Seguridad: Retiro de OAuth**
   - *Contexto*: La integración con terceros (GitHub) aumentaba la superficie de ataque y complejidad de gestión de tokens.
   - *Decisión*: Se optó por **eliminar** la funcionalidad de OAuth del producto final para priorizar un modelo de seguridad cerrado y autocontenido.

2. **Reseteo Automático de Filtros**
   - *Problema*: Al aplicar un filtro (ej. por entorno), la lista de proyectos se recargaba y perdía el filtro después de 3 segundos.
   - *Solución*: Refactorización de la lógica de navegación para eliminar el `useEffect` conflictivo.

2. **Error en Logs de Uso de API Key**
   - *Problema*: Error 500 al usar una API Key válida: `relation "api_key_usage_logs" does not exist`.
   - *Solución*: Se agregó la definición de la tabla faltante en el script de inicialización.

3. **Conflicto de Estilos CSS en Sidebars**
   - *Problema*: La sidebar de la App Guide heredaba estilos púrpuras no deseados de la OpenAPI Guide debido a clases genéricas (`.sidebar-header`).
   - *Solución*: Namespacing de clases CSS (`.app-sidebar-*` vs `.guide-sidebar-*`) y sincronización manual de estilos para paridad visual pixel-perfect.

4. **Crash por Referencia React Perdida**
   - *Problema*: La página de OpenAPI Guide dejó de renderizar tras un refactor.
   - *Causa*: Se eliminó el hook `useRef` pero se mantuvo su asignación en el JSX.
   - *Solución*: Restauración de la inicialización de `sidebarRefs`.

#### 📝 Commits Relacionados
- fix: Refactorización de navegación en WorkspacePage para persistencia de filtros
- feat(realtime): Implementación de Socket.IO para updates de API Keys
- feat(auth): Endpoints y botones para desconexión de GitHub OAuth
- refactor(ui): Estandarización de iconos Lucide y paleta de colores en Guías
- fix(css): Resolución de colisiones de estilos en componentes Sidebar
- docs: Actualización masiva de contenido y estructura en App Guide

---

### Semana 8 (2 - 8 de febrero de 2026)

#### 🎯 Objetivos
- Optimizar la interfaz de edición de documentos
- Implementar sistema de comparación de versiones (Diffing)
- Corregir lógica de versionamiento y parseo de repositorios
- Actualizar documentación del proyecto

#### ✅ Logros
- **Editor Split-View**: Rediseño del editor Markdown para maximizar el espacio vertical y mostrar vista previa lado a lado sin stack vertical.
- **Visualizador de Cambios (Diff)**: Implementación de `DiffViewer` integrada en el historial, permitiendo ver qué contenido se agregó o eliminó entre versiones.
- **Corrección de Versionamiento**: Transición de versionado semántico (1.0.0) a escalar (v1, v2, v3) para simplificar la experiencia de usuario.
- **Parseo de Repositorios**: Solución a fallos en el análisis inicial de repositorios conectados.

#### ⚠️ Dificultades Encontradas

1. **Bug en Números de Versión**
   - *Problema*: Las versiones se guardaban con formato '1.x.x' causando confusión.
   - *Solución*: Ajuste en backend para usar contadores incrementales simples y limpiar versiones antiguas.

2. **Visualización de Diferencias**
   - *Problema*: Necesidad de mostrar cambios de forma clara sin sobrecargar la UI.
   - *Solución*: Integración de librería `diff` en frontend con un modal dedicado y código de colores (Verde/Rojo) accesible desde el historial.

3. **Layout del Editor**
   - *Problema*: El editor desperdiciaba espacio vertical y ocultaba la vista previa en pantallas medianas.
   - *Solución*: Refactor CSS completo para layout flexbox de altura completa y eliminación de márgenes innecesarios.

#### 📝 Commits Relacionados
- fix: Corrección de lógica de versionado escalar
- feat: Rediseño de layout del editor (Split View optimizado)
- feat: Implementación de DiffViewer y UI de historial
- docs: Actualización de README y limpieza de guías obsoletas
- fix: Resolución de bug en parser de repositorios

---

### Semana 9 (9 - 11 de febrero de 2026 - Cierre de Práctica)

#### 🎯 Objetivos
- Implementar visualización de diferencias entre versiones de documentos (Diffing)
- Depurar y corregir lógica de permisos de edición
- Estabilizar el sistema de propiedad de documentos (Ownership)

#### ✅ Logros
- **Visualizador de Diff**: Implementación exitosa de comparación visual que resalta adiciones y eliminaciones en el historial de versiones
- **Corrección de Permisos**: Resolución del bug que ocultaba el botón de edición a usuarios autenticados legítimos
- **Refactorización de Auth**: Mejora en la propagación del estado de autenticación

#### ⚠️ Dificultades Encontradas

1. **Lógica de 'canEdit' Falsa Negativa**
   - *Problema*: Usuarios con permisos válidos no veían el botón de editar
   - *Solución*: Ajuste en `DocumentViewPage.jsx` para evaluar correctamente la propiedad y roles

2. **Integración de Librería de Diff**
   - *Problema*: Visualizar cambios de forma limpia sin romper el layout
   - *Solución*: Creación de componente modal dedicado para la vista de diferencias

#### 📝 Commits Relacionados
- feat: implement ownership and services
- fix: edit button visibility logic
- feat: document diff viewer implementation

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
- [x] Comparación visual de versiones (Diffing)

### Funcionalidades Pendientes 📋
- [ ] Búsqueda full-text en contenido
- [x] Versionado detallado de documentos
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

**Documento generado automáticamente - Última actualización: 11 de febrero de 2026**
