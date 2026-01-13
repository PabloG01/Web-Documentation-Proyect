const express = require('express');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/auth');
const { validateProject, validateProjectId } = require('../middleware/validators');
const { createLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Gestión de proyectos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del proyecto
 *         user_id:
 *           type: integer
 *           description: ID del usuario propietario
 *         code:
 *           type: string
 *           description: Código corto del proyecto (ej. PRY)
 *         name:
 *           type: string
 *           description: Nombre del proyecto
 *         description:
 *           type: string
 *           description: Descripción del proyecto
 *         color:
 *           type: string
 *           description: Color hexadecimal del proyecto
 *         created_at:
 *           type: string
 *           format: date-time
 *     ProjectInput:
 *       type: object
 *       required:
 *         - code
 *         - name
 *       properties:
 *         code:
 *           type: string
 *           maxLength: 10
 *           description: Código corto del proyecto (máx 10 caracteres)
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Nombre del proyecto
 *         description:
 *           type: string
 *           description: Descripción opcional
 *         color:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *           description: Color hexadecimal (ej. #6366f1)
 *     PaginatedProjects:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Project'
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

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Listar todos los proyectos con paginación
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: user_only
 *         schema:
 *           type: boolean
 *         description: Filtrar solo proyectos del usuario autenticado
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
 *         description: Elementos por página (máx 100)
 *     responses:
 *       200:
 *         description: Lista paginada de proyectos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProjects'
 */
router.get('/', asyncHandler(async (req, res) => {
    const { user_only, page = 1, limit = 10 } = req.query;

    // Validate and parse pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    let countQuery = 'SELECT COUNT(*) FROM projects';
    let query = 'SELECT projects.*, users.username FROM projects LEFT JOIN users ON projects.user_id = users.id';
    let params = [];
    let countParams = [];

    if (user_only && req.user) {
        query += ' WHERE projects.user_id = $1';
        countQuery += ' WHERE user_id = $1';
        params.push(req.user.id);
        countParams.push(req.user.id);
    }

    query += ' ORDER BY projects.created_at DESC';

    // Add pagination
    const paginationParamStart = params.length + 1;
    query += ` LIMIT $${paginationParamStart} OFFSET $${paginationParamStart + 1}`;
    params.push(limitNum, offset);

    // Get total count and paginated results
    const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, countParams),
        pool.query(query, params)
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limitNum);

    res.json({
        data: dataResult.rows,
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
 * /projects:
 *   post:
 *     summary: Crear un nuevo proyecto
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *           example:
 *             code: "PRY"
 *             name: "Mi Proyecto"
 *             description: "Descripción del proyecto"
 *             color: "#6366f1"
 *     responses:
 *       201:
 *         description: Proyecto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
router.post('/', verifyToken, createLimiter, validateProject, asyncHandler(async (req, res) => {
    const { code, name, description, color } = req.body;

    const result = await pool.query(
        'INSERT INTO projects (user_id, code, name, description, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, code, name, description, color || '#6366f1']
    );

    res.status(201).json(result.rows[0]);
}));

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Actualizar un proyecto
 *     tags: [Projects]
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
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       200:
 *         description: Proyecto actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       403:
 *         description: No autorizado (no es el propietario)
 *       404:
 *         description: Proyecto no encontrado
 */
router.put('/:id', verifyToken, validateProjectId, validateProject, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, description, color } = req.body;

    // Check ownership
    const check = await pool.query('SELECT user_id FROM projects WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        throw new AppError('Proyecto no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    const result = await pool.query(
        'UPDATE projects SET code = $1, name = $2, description = $3, color = $4 WHERE id = $5 RETURNING *',
        [code, name, description, color, id]
    );

    res.json(result.rows[0]);
}));

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Eliminar un proyecto
 *     tags: [Projects]
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
 *         description: Proyecto eliminado
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
 *         description: Proyecto no encontrado
 */
router.delete('/:id', verifyToken, validateProjectId, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const check = await pool.query('SELECT user_id FROM projects WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        throw new AppError('Proyecto no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
}));

module.exports = router;
