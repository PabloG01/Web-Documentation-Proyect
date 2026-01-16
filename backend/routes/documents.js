const express = require('express');
const { documentsRepository, projectsRepository } = require('../repositories');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/verifyToken');
const { validateCreateDocument, validateUpdateDocument, validateDocumentId } = require('../middleware/validators');
const { createLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Endpoints para gestión de documentos
 * servers:
 *   - url: /documents
 *     description: Servidor de Documentos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del documento
 *         project_id:
 *           type: integer
 *           description: ID del proyecto al que pertenece
 *         user_id:
 *           type: integer
 *           description: ID del usuario creador
 *         title:
 *           type: string
 *           description: Título del documento
 *         content:
 *           type: string
 *           description: Contenido del documento en Markdown
 *         doc_type:
 *           type: string
 *           description: Tipo de documento
 *           enum: [api, manual, tecnica]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         project_name:
 *           type: string
 *           description: Nombre del proyecto (obtenido via JOIN)
 *         project_code:
 *           type: string
 *           description: Código del proyecto
 *         username:
 *           type: string
 *           description: Nombre del usuario creador
 *     CreateDocumentInput:
 *       type: object
 *       required:
 *         - project_id
 *         - title
 *         - content
 *         - doc_type
 *       properties:
 *         project_id:
 *           type: integer
 *           description: ID del proyecto (requerido)
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Título del documento
 *         content:
 *           type: string
 *           description: Contenido en Markdown
 *         doc_type:
 *           type: string
 *           enum: [api, manual, tecnica]
 *           description: Tipo de documento
 *     UpdateDocumentInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 200
 *         content:
 *           type: string
 *         doc_type:
 *           type: string
 *           enum: [api, manual, tecnica]
 *     PaginatedDocuments:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Document'
 *         pagination:
 *           type: object
 *           properties:
 *             currentPage:
 *               type: integer
 *             totalPages:
 *               type: integer
 *             totalItems:
 *               type: integer
 *             itemsPerPage:
 *               type: integer
 *             hasNextPage:
 *               type: boolean
 *             hasPrevPage:
 *               type: boolean
 */

// Optional token verification (doesn't require auth, but extracts user if present)
const optionalVerifyToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        req.user = null;
        return next();
    }

    const jwt = require('jsonwebtoken');
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
    } catch (err) {
        req.user = null;
    }
    next();
};

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Listar documentos
 *     description: Obtiene una lista paginada de documentos. Opcionalmente filtra por proyecto o solo los del usuario autenticado.
 *     tags: [Documents]
 *     parameters:
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de proyecto
 *       - in: query
 *         name: user_only
 *         schema:
 *           type: boolean
 *         description: Si es true, solo devuelve documentos del usuario actual
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Elementos por página
 *     responses:
 *       200:
 *         description: Lista paginada de documentos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedDocuments'
 */
// GET /documents - List all documents with pagination and optional user filter
router.get('/', optionalVerifyToken, asyncHandler(async (req, res) => {
    const { project_id, user_only, page = 1, limit = 10 } = req.query;

    const result = await documentsRepository.findAll({
        projectId: project_id,
        userId: user_only === 'true' && req.user ? req.user.id : null,
        page,
        limit
    });

    res.json(result);
}));

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Obtener documento por ID
 *     description: Obtiene un documento específico por su ID. Requiere autenticación.
 *     tags: [Documents]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Documento encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Documento no encontrado
 */
// GET /documents/:id - Get a single document by ID (requires auth to view, any user can see all)
router.get('/:id', verifyToken, validateDocumentId, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const doc = await documentsRepository.findByIdWithDetails(id);

    if (!doc) {
        throw new AppError('Documento no encontrado', 404);
    }

    // Add flag to indicate if current user can edit
    doc.can_edit = doc.user_id === req.user.id;

    res.json(doc);
}));

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Crear nuevo documento
 *     description: Crea un nuevo documento. Requiere autenticación.
 *     tags: [Documents]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDocumentInput'
 *           example:
 *             title: "Manual de Usuario"
 *             content: "# Introducción\n\nEste es el manual..."
 *             doc_type: "manual"
 *             project_id: 1
 *     responses:
 *       201:
 *         description: Documento creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       401:
 *         description: No autenticado
 *       429:
 *         description: Demasiadas solicitudes (rate limit)
 */
// POST /documents - Create a new document
router.post('/', verifyToken, createLimiter, validateCreateDocument, asyncHandler(async (req, res) => {
    const { project_id, title, content, type } = req.body;

    // Validate project_id is required
    if (!project_id) {
        throw new AppError('El proyecto es requerido', 400);
    }

    // Verify project exists
    const projectExists = await projectsRepository.exists(project_id);
    if (!projectExists) {
        throw new AppError('Proyecto no encontrado', 404);
    }

    const doc = await documentsRepository.createDocument({
        projectId: project_id,
        userId: req.user.id,
        title,
        content,
        type
    });

    res.status(201).json(doc);
}));

/**
 * @swagger
 * /documents/{id}:
 *   put:
 *     summary: Actualizar documento
 *     description: Actualiza un documento existente. Solo el propietario puede hacerlo.
 *     tags: [Documents]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDocumentInput'
 *     responses:
 *       200:
 *         description: Documento actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       403:
 *         description: No autorizado (no es el propietario)
 *       404:
 *         description: Documento no encontrado
 */
// PUT /documents/:id - Update a document
router.put('/:id', verifyToken, validateDocumentId, validateUpdateDocument, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, doc_type } = req.body;

    // Check ownership
    const isOwner = await documentsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('Documento no encontrado', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    // Prepare update data dynamic object
    const updateData = {
        updated_at: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (doc_type !== undefined) updateData.type = doc_type;

    const doc = await documentsRepository.update(id, updateData);

    res.json(doc);
}));

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Eliminar documento
 *     description: Elimina permanentemente un documento. Solo el propietario puede hacerlo.
 *     tags: [Documents]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Documento eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Document deleted successfully"
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Documento no encontrado
 */
// DELETE /documents/:id - Delete a document
router.delete('/:id', verifyToken, validateDocumentId, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const isOwner = await documentsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('Documento no encontrado', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    await documentsRepository.delete(id);

    res.json({ message: 'Document deleted successfully' });
}));

module.exports = router;
