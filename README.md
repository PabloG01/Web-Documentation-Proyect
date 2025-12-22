# 📚 DocApp - Aplicación de Documentación Profesional

Aplicación web para crear, gestionar y organizar documentación técnica y profesional por proyectos.

## ✨ Características

### 📁 **Gestión de Proyectos**
- Crea proyectos con códigos únicos (ej: PRY-001, API-2024)
- Organiza documentos por código de proyecto
- Códigos de color para identificación rápida
- Gestión completa: crear, editar, eliminar proyectos

### 📄 **Tipos de Documentación**
- 🔌 **API** - Documentación de endpoints y APIs REST
- 👤 **Manual de Usuario** - Guías para usuarios finales
- ⚙️ **Técnica** - Arquitectura y especificaciones técnicas
- 📊 **Procesos** - Flujos de procesos de negocio
- 📋 **Proyecto** - Resúmenes ejecutivos y objetivos
- ✅ **Requisitos** - Especificación de requerimientos

### 🔍 **Búsqueda y Filtros**
- Búsqueda por título y descripción
- Filtro por tipo de documentación
- Filtro por proyecto
- Navegación rápida entre proyectos

### ✏️ **Editor Completo**
- Vista previa formateada con Markdown simple
- Modo edición inline
- Control de versiones
- Seguimiento de cambios (creado/actualizado)

## 🚀 Instalación

### Prerrequisitos
- Node.js 14+ 
- npm 6+

### Pasos

1. **Clonar el repositorio**
```bash
git clone <url-repositorio>
cd prueba-de-documentacion
```

2. **Instalar dependencias del frontend**
```bash
cd frontend
npm install --legacy-peer-deps
```

3. **Iniciar servidor de desarrollo**
```bash
npm start
```

La aplicación se abrirá en [http://localhost:3000](http://localhost:3000)

## 📂 Estructura del Proyecto

```
prueba-de-documentacion/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── DocumentCard.js
│   │   │   ├── DocumentForm.js
│   │   │   ├── DocumentTypeSelector.js
│   │   │   └── ProjectSelector.js
│   │   ├── pages/
│   │   │   ├── HomePage.js
│   │   │   ├── CreatePage.js
│   │   │   ├── DocumentsListPage.js
│   │   │   ├── DocumentViewPage.js
│   │   │   └── ProjectsPage.js
│   │   ├── styles/
│   │   │   └── *.css
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── package.json
```

## 🎯 Flujo de Uso

### Crear un Documento
1. Ir a **Crear** en el menú
2. **Paso 1**: Seleccionar o crear un proyecto
3. **Paso 2**: Seleccionar tipo de documentación
4. **Paso 3**: Llenar formulario con plantilla predefinida
5. Guardar documento

### Gestionar Proyectos
1. Ir a **Proyectos** en el menú
2. Ver todos los proyectos con conteo de documentos
3. Editar información del proyecto
4. Eliminar proyectos (con confirmación)

### Ver y Editar Documentos
1. Ir a **Mis Documentos**
2. Filtrar por proyecto o tipo
3. Clickear **Ver** para visualizar
4. Clickear **Editar** para modificar
5. Guardar cambios

## 🛠️ Tecnologías

- **React 19** - Framework UI
- **React Router DOM 6** - Navegación
- **LocalStorage** - Persistencia de datos
- **CSS3** - Estilos personalizados
- **React Scripts 5** - Build tools

## 📋 Scripts Disponibles

En el directorio `frontend/`:

- `npm start` - Inicia servidor de desarrollo
- `npm run build` - Crea build de producción
- `npm test` - Ejecuta tests
- `npm run eject` - Expone configuración (irreversible)

## 💾 Almacenamiento

Los datos se guardan en **localStorage** del navegador:

- `projects` - Array de proyectos
- `documents` - Array de documentos

### Estructura de Datos

**Proyecto:**
```json
{
  "id": "1234567890",
  "code": "PRY",
  "name": "Proyecto Ejemplo",
  "description": "Descripción del proyecto",
  "color": "#6366f1",
  "createdAt": "2025-12-19T10:00:00.000Z"
}
```

**Documento:**
```json
{
  "id": "1234567890",
  "projectId": "1234567890",
  "type": "api",
  "typeName": "Documentación API",
  "title": "API REST Usuarios",
  "description": "Endpoints de usuarios",
  "author": "Juan Pérez",
  "version": "1.0.0",
  "content": "# Contenido...",
  "createdAt": "2025-12-19T10:00:00.000Z",
  "updatedAt": "2025-12-19T11:00:00.000Z"
}
```

## 🎨 Paleta de Colores

- Primary: `#6366f1` (Índigo)
- Secondary: `#8b5cf6` (Violeta)
- Accent: `#ec4899` (Rosa)
- Success: `#10b981` (Verde)
- Warning: `#f59e0b` (Naranja)
- Danger: `#ef4444` (Rojo)

## 🚧 Roadmap

- [ ] Exportar a PDF
- [ ] Importar/Exportar datos
- [ ] Backend con API REST
- [ ] Autenticación de usuarios
- [ ] Colaboración en tiempo real
- [ ] Historial de versiones
- [ ] Templates personalizados
- [ ] Integración con Git

## 📝 Licencia

Este proyecto es de código abierto.

## 👤 Autor

Desarrollado como proyecto de demostración.
