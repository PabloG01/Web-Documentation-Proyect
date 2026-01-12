const express = require('express');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { createLimiter } = require('../middleware/rateLimiter');
const { parseSwaggerComments, extractSpecPreview } = require('../services/swagger-parser');
const multer = require('multer');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: API Specs
 *   description: Gestión de especificaciones OpenAPI/Swagger
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiSpec:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la especificación
 *         project_id:
 *           type: integer
 *           description: ID del proyecto asociado
 *         user_id:
 *           type: integer
 *           description: ID del usuario creador
 *         name:
 *           type: string
 *           description: Nombre de la especificación
 *         description:
 *           type: string
 *           description: Descripción de la especificación
 *         spec_content:
 *           type: object
 *           description: Contenido OpenAPI en formato JSON
 *         source_type:
 *           type: string
 *           description: Tipo de fuente (json, swagger-comments)
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ApiSpecInput:
 *       type: object
 *       required:
 *         - project_id
 *         - name
 *         - spec_content
 *       properties:
 *         project_id:
 *           type: integer
 *           description: ID del proyecto (requerido)
 *         name:
 *           type: string
 *           description: Nombre de la especificación
 *         description:
 *           type: string
 *           description: Descripción opcional
 *         spec_content:
 *           type: object
 *           description: Especificación OpenAPI en formato JSON
 *     ParseSwaggerResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         spec:
 *           type: object
 *           description: Especificación OpenAPI generada
 *         preview:
 *           type: object
 *           description: Vista previa de endpoints y schemas
 *         fileName:
 *           type: string
 *         sourceCode:
 *           type: string
 *         message:
 *           type: string
 */

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/javascript' ||
            file.mimetype === 'text/javascript' ||
            file.originalname.endsWith('.js')) {
            cb(null, true);
        } else {
            cb(new Error('Only JavaScript files (.js) are allowed'));
        }
    }
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
    // Debug: Log incoming cookies
    console.log('=== DEBUG verifyToken ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Cookies received:', req.cookies);
    console.log('Cookie header:', req.headers.cookie);
    console.log('========================');

    const token = req.cookies.auth_token;
    if (!token) {
        return next(new AppError('Acceso denegado', 401));
    }

    const jwt = require('jsonwebtoken');
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        next(new AppError('Token inválido', 400));
    }
};

// Middleware opcional - extrae user si hay token, pero no falla si no hay
const optionalVerifyToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (token) {
        const jwt = require('jsonwebtoken');
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            req.user = verified;
        } catch (err) {
            // Token inválido, pero es opcional - continuar sin user
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
};

/**
 * @swagger
 * /api-specs:
 *   get:
 *     summary: Listar todas las especificaciones API
 *     tags: [API Specs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de proyecto
 *     responses:
 *       200:
 *         description: Lista de especificaciones API
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ApiSpec'
 *       401:
 *         description: No autenticado
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    const { project_id } = req.query;

    let query = `
        SELECT api_specs.*, projects.name as project_name, projects.code as project_code,
               users.username as creator_username
        FROM api_specs 
        LEFT JOIN projects ON api_specs.project_id = projects.id
        LEFT JOIN users ON api_specs.user_id = users.id
    `;
    let params = [];
    let paramIndex = 1;

    if (project_id) {
        query += ` WHERE api_specs.project_id = $${paramIndex}`;
        params.push(project_id);
        paramIndex++;
    }

    query += ' ORDER BY api_specs.updated_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
}));


/**
 * @swagger
 * /api-specs/{id}:
 *   get:
 *     summary: Obtener una especificación API por ID
 *     tags: [API Specs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la especificación
 *     responses:
 *       200:
 *         description: Especificación API encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSpec'
 *       404:
 *         description: Especificación no encontrada
 *       401:
 *         description: No autenticado
 */
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(
        `SELECT api_specs.*, projects.name as project_name, projects.code as project_code,
                users.username as creator_username
         FROM api_specs 
         LEFT JOIN projects ON api_specs.project_id = projects.id
         LEFT JOIN users ON api_specs.user_id = users.id
         WHERE api_specs.id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }

    res.json(result.rows[0]);
}));

/**
 * @swagger
 * /api-specs/parse-swagger:
 *   post:
 *     summary: Parsear archivo JavaScript con comentarios Swagger
 *     tags: [API Specs]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo JavaScript (.js) con comentarios Swagger
 *     responses:
 *       200:
 *         description: Archivo parseado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParseSwaggerResponse'
 *       400:
 *         description: Error en el archivo o formato inválido
 *       401:
 *         description: No autenticado
 */
router.post('/parse-swagger', verifyToken, createLimiter, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    try {
        const code = req.file.buffer.toString('utf8');
        const fileName = req.file.originalname;

        //Parse Swagger comments and generate OpenAPI spec
        const result = parseSwaggerComments(code, fileName);

        // Extract preview information
        const preview = extractSpecPreview(result.spec);

        res.json({
            success: true,
            spec: result.spec,
            preview,
            fileName,
            sourceCode: code,
            message: `Successfully parsed ${result.pathsCount} path(s) and ${result.schemasCount} schema(s)`
        });

    } catch (error) {
        throw new AppError(error.message, 400);
    }
}));

/**
 * @swagger
 * /api-specs:
 *   post:
 *     summary: Crear una nueva especificación API
 *     tags: [API Specs]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiSpecInput'
 *     responses:
 *       201:
 *         description: Especificación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSpec'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
router.post('/', verifyToken, createLimiter, asyncHandler(async (req, res) => {
    const { project_id, name, description, spec_content } = req.body;

    // Validate required fields
    if (!project_id) {
        throw new AppError('El proyecto es requerido', 400);
    }
    if (!name || !name.trim()) {
        throw new AppError('El nombre es requerido', 400);
    }
    if (!spec_content || typeof spec_content !== 'object') {
        throw new AppError('El contenido de la especificación es requerido y debe ser JSON válido', 400);
    }

    // Validate project exists
    const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1',
        [project_id]
    );
    if (projectCheck.rows.length === 0) {
        throw new AppError('Proyecto no encontrado', 404);
    }

    const result = await pool.query(
        `INSERT INTO api_specs (project_id, user_id, name, description, spec_content) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [project_id, req.user.id, name.trim(), description || '', spec_content]
    );

    res.status(201).json(result.rows[0]);
}));

/**
 * @swagger
 * /api-specs/{id}:
 *   put:
 *     summary: Actualizar una especificación API
 *     tags: [API Specs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiSpecInput'
 *     responses:
 *       200:
 *         description: Especificación actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSpec'
 *       403:
 *         description: No autorizado (no es el propietario)
 *       404:
 *         description: Especificación no encontrada
 */
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { project_id, name, description, spec_content } = req.body;

    // Check ownership and get current content
    const check = await pool.query(
        'SELECT user_id, spec_content FROM api_specs WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    // Validate required fields
    if (!name || !name.trim()) {
        throw new AppError('El nombre es requerido', 400);
    }
    if (!spec_content || typeof spec_content !== 'object') {
        throw new AppError('El contenido de la especificación es requerido y debe ser JSON válido', 400);
    }

    // Validate project exists if provided
    if (project_id) {
        const projectCheck = await pool.query(
            'SELECT id FROM projects WHERE id = $1',
            [project_id]
        );
        if (projectCheck.rows.length === 0) {
            throw new AppError('Proyecto no encontrado', 404);
        }
    }

    // Save current version before updating (max 4 versions)
    const MAX_VERSIONS = 4;
    const currentContent = check.rows[0].spec_content;

    // Get next version number
    const versionResult = await pool.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM api_spec_versions WHERE api_spec_id = $1',
        [id]
    );
    const nextVersion = versionResult.rows[0].next_version;

    // Save version
    await pool.query(
        `INSERT INTO api_spec_versions (api_spec_id, version_number, spec_content, change_summary)
         VALUES ($1, $2, $3, $4)`,
        [id, nextVersion, currentContent, `Version ${nextVersion} - Auto-saved`]
    );

    // Delete old versions if exceeds limit
    await pool.query(
        `DELETE FROM api_spec_versions 
         WHERE api_spec_id = $1 
         AND version_number NOT IN (
             SELECT version_number FROM api_spec_versions 
             WHERE api_spec_id = $1 
             ORDER BY version_number DESC 
             LIMIT $2
         )`,
        [id, MAX_VERSIONS]
    );

    // Update the spec
    const result = await pool.query(
        `UPDATE api_specs 
         SET project_id = $1, name = $2, description = $3, spec_content = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 
         RETURNING *`,
        [project_id || null, name.trim(), description || '', spec_content, id]
    );

    res.json(result.rows[0]);
}));

/**
 * @swagger
 * /api-specs/{id}/versions:
 *   get:
 *     summary: Listar versiones de una especificación
 *     tags: [API Specs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de versiones
 */
router.get('/:id/versions', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const check = await pool.query(
        'SELECT user_id FROM api_specs WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    const result = await pool.query(
        `SELECT id, version_number, change_summary, created_at 
         FROM api_spec_versions 
         WHERE api_spec_id = $1 
         ORDER BY version_number DESC`,
        [id]
    );

    res.json(result.rows);
}));

/**
 * @swagger
 * /api-specs/{id}/versions/{versionId}:
 *   get:
 *     summary: Obtener contenido de una versión específica
 *     tags: [API Specs]
 */
router.get('/:id/versions/:versionId', verifyToken, asyncHandler(async (req, res) => {
    const { id, versionId } = req.params;

    // Check ownership
    const check = await pool.query(
        'SELECT user_id FROM api_specs WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    const result = await pool.query(
        `SELECT * FROM api_spec_versions 
         WHERE api_spec_id = $1 AND id = $2`,
        [id, versionId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Versión no encontrada', 404);
    }

    res.json(result.rows[0]);
}));

/**
 * @swagger
 * /api-specs/{id}/versions/{versionId}/restore:
 *   post:
 *     summary: Restaurar una versión anterior
 *     tags: [API Specs]
 */
router.post('/:id/versions/:versionId/restore', verifyToken, asyncHandler(async (req, res) => {
    const { id, versionId } = req.params;

    // Check ownership
    const check = await pool.query(
        'SELECT user_id, spec_content FROM api_specs WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    // Get version to restore
    const versionResult = await pool.query(
        'SELECT spec_content, version_number FROM api_spec_versions WHERE api_spec_id = $1 AND id = $2',
        [id, versionId]
    );

    if (versionResult.rows.length === 0) {
        throw new AppError('Versión no encontrada', 404);
    }

    const versionToRestore = versionResult.rows[0];

    // Save current as new version before restoring
    const MAX_VERSIONS = 4;
    const currentContent = check.rows[0].spec_content;

    const nextVersionResult = await pool.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM api_spec_versions WHERE api_spec_id = $1',
        [id]
    );
    const nextVersion = nextVersionResult.rows[0].next_version;

    await pool.query(
        `INSERT INTO api_spec_versions (api_spec_id, version_number, spec_content, change_summary)
         VALUES ($1, $2, $3, $4)`,
        [id, nextVersion, currentContent, `Before restore to v${versionToRestore.version_number}`]
    );

    // Cleanup old versions
    await pool.query(
        `DELETE FROM api_spec_versions 
         WHERE api_spec_id = $1 
         AND version_number NOT IN (
             SELECT version_number FROM api_spec_versions 
             WHERE api_spec_id = $1 
             ORDER BY version_number DESC 
             LIMIT $2
         )`,
        [id, MAX_VERSIONS]
    );

    // Restore the spec content
    const result = await pool.query(
        `UPDATE api_specs 
         SET spec_content = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 
         RETURNING *`,
        [versionToRestore.spec_content, id]
    );

    res.json({
        message: `Restaurado a versión ${versionToRestore.version_number}`,
        spec: result.rows[0]
    });
}));

/**
 * @swagger
 * /api-specs/{id}:
 *   delete:
 *     summary: Eliminar una especificación API
 *     tags: [API Specs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Especificación eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: No autorizado (no es el propietario)
 *       404:
 *         description: Especificación no encontrada
 */
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const check = await pool.query(
        'SELECT user_id FROM api_specs WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    await pool.query('DELETE FROM api_specs WHERE id = $1', [id]);
    res.json({ message: 'API Spec eliminada correctamente' });
}));

module.exports = router;

