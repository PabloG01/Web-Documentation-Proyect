const express = require('express');
const { pool } = require('../database');
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

    // Validate and parse pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT documents.*, projects.name as project_name, projects.code as project_code, users.username
                 FROM documents 
                 LEFT JOIN projects ON documents.project_id = projects.id
                 LEFT JOIN users ON documents.user_id = users.id
                 WHERE 1=1`;

    const params = [];
    let paramIndex = 1;

    // Filter by project
    if (project_id) {
        query += ` AND documents.project_id = $${paramIndex}`;
        params.push(parseInt(project_id));
        paramIndex++;
    }

    // Filter by user if requested
    if (user_only === 'true' && req.user) {
        query += ` AND documents.user_id = $${paramIndex}`;
        params.push(req.user.id);
        paramIndex++;
    }

    // Count total items
    const countQuery = query.replace(
        'SELECT documents.*, projects.name as project_name, projects.code as project_code, users.username',
        'SELECT COUNT(*)'
    );
    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].count);

    // Add pagination
    query += ` ORDER BY documents.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limitNum);

    res.json({
        data: result.rows,
        pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems,
            itemsPerPage: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        }
    });
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

    const result = await pool.query(
        `SELECT documents.*, projects.name as project_name, projects.code as project_code, users.username
         FROM documents 
         LEFT JOIN projects ON documents.project_id = projects.id 
         LEFT JOIN users ON documents.user_id = users.id 
         WHERE documents.id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new AppError('Documento no encontrado', 404);
    }

    // Add flag to indicate if current user can edit
    const doc = result.rows[0];
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
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [project_id]);
    if (projectCheck.rows.length === 0) {
        throw new AppError('Proyecto no encontrado', 404);
    }

    const result = await pool.query(
        `INSERT INTO documents (project_id, user_id, title, content, type) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [project_id, req.user.id, title, content, type || 'general']
    );

    res.status(201).json(result.rows[0]);
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
    const check = await pool.query(
        'SELECT user_id FROM documents WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('Documento no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    const result = await pool.query(
        `UPDATE documents 
         SET title = $1, content = $2, doc_type = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 RETURNING *`,
        [title, content, doc_type, id]
    );

    res.json(result.rows[0]);
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
    const check = await pool.query(
        'SELECT user_id FROM documents WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('Documento no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [id]);

    res.json({ message: 'Document deleted successfully' });
}));

module.exports = router;
