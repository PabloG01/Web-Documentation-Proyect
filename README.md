# 📚 DocApp - Plataforma de Documentación Profesional

Sistema completo de gestión de documentación técnica con arquitectura cliente-servidor, autenticación JWT, y despliegue con Docker.

## ✨ Características Principales

### 🔐 **Autenticación y Seguridad**
- Sistema de registro e inicio de sesión con JWT
- Tokens HTTP-only para máxima seguridad
- **Gestión de API Keys Personalizadas** para acceso programático
- Rate limiting en endpoints de API
- Protección con Helmet.js y CORS configurado
- Validación de datos con express-validator
- Cifrado de contraseñas con bcrypt

### 📁 **Gestión de Proyectos**
- Creación de proyectos con códigos únicos
- Organización de documentos por proyecto
- **Entornos Personalizados** (Dev, Staging, Prod)
- Códigos de color personalizados
- Operaciones CRUD completas

### 📝 **Documentación y Versionado**
- **Editor Markdown Split-View** optimizado para máxima productividad
- **Historial de Versiones Escalar** (v1, v2, v3...)
- **Visualizador de Cambios (Diffing)**: Comparación visual de adiciones y eliminaciones entre versiones
- Exportación a PDF profesional
- Soporte para sintaxis GFM (GitHub Flavored Markdown)

...

### 🚀 Instalación y Despliegue

### Opción 1: Docker (Producción / Recomendado)

#### Prerrequisitos
- Docker Desktop instalado
- Docker Compose instalado

#### Instrucciones
```bash
# 1. Clonar el repositorio
git clone <url-repositorio>
cd Web-Documentation-Proyect

# 2. Configurar variables de entorno
cp .env.example .env
# IMPORTANTE: Editar .env con contraseñas seguras para producción

# 3. Construir e iniciar (Modo Producción)
docker-compose up -d --build

# 4. Acceder a la aplicación
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

#### Servicios Docker
El archivo `docker-compose.yml` orquesta:
1. **Base de Datos** (PostgreSQL 16) con volumen persistente.
2. **Backend** (Node.js 22) espera a la DB.
3. **Frontend** (React + Nginx) servido estáticamente para máximo rendimiento.

### Opción 2: Desarrollo Local (Hot Reload)

#### Backend
```bash
cd backend
npm install
npm run dev  # Inicia con nodemon
```

#### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start    # Inicia servidor Vite con Hot Reload
```

...

## 📚 Documentación Adicional

- La documentación de API completa está disponible en `/api-docs` una vez iniciada la aplicación.
- Las guías de uso (OpenAPI, Paginación) están integradas directamente en la sección "Guías" de la aplicación web.

## 🐛 Troubleshooting

### Hot reload no funciona en Windows (Docker)
**Solución**: Se ha habilitado `usePolling: true` en Vite. Si persiste, reiniciar el contenedor:
```bash
docker-compose restart frontend
```

## Licencia

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

**Última actualización**: Febrero 2026
