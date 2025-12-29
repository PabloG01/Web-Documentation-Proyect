# Ejemplo de Anotaciones OpenAPI en tu Proyecto

## Ubicación de las anotaciones

Las anotaciones `@swagger` van **DENTRO** de tus archivos de rutas existentes, **ANTES** de cada endpoint.

## Ejemplo práctico para tu proyecto

### En `routes/documents.js`:

```javascript
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Obtener todos los documentos
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de documentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 */
router.get('/', authenticateToken, async (req, res) => {
  // Tu código existente
});

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Crear un nuevo documento
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentInput'
 *     responses:
 *       201:
 *         description: Documento creado exitosamente
 */
router.post('/', authenticateToken, async (req, res) => {
  // Tu código existente
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         project_id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     DocumentInput:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - project_id
 *       properties:
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         project_id:
 *           type: integer
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
```

### En `routes/auth.js`:

```javascript
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 */
router.post('/register', async (req, res) => {
  // Tu código existente
});
```

## Estructura de archivos

```
backend/
├── server.js          ← Configuración de swagger-jsdoc (ya la tienes)
└── routes/
    ├── auth.js        ← Añadir anotaciones aquí
    ├── documents.js   ← Añadir anotaciones aquí
    └── projects.js    ← Añadir anotaciones aquí
```

## Pasos para implementar

1. ✅ **Ya configuraste** `server.js` con swagger-jsdoc
2. **Ahora debes** añadir las anotaciones `/** @swagger ... */` ANTES de cada ruta en:
   - `routes/auth.js`
   - `routes/documents.js`
   - `routes/projects.js`
3. Las anotaciones se escriben justo antes del `router.get()`, `router.post()`, etc.
4. Swagger leerá automáticamente todos los archivos `.js` en la carpeta `routes/`

## Resultado

Después de añadir las anotaciones, podrás acceder a:
- **UI Interactiva**: `http://localhost:5000/api-docs`
- **JSON de la spec**: `http://localhost:5000/api-docs.json`
