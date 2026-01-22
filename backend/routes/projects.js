const express = require('express');
const { projectsRepository } = require('../repositories');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/verifyToken');
const { flexibleAuth } = require('../middleware/apiKeyAuth');
const { validateProject, validateProjectId } = require('../middleware/validators');
const { createLimiter } = require('../middleware/rateLimiter');
const { sanitizePagination, sanitizeInteger, sanitizeBoolean } = require('../utils/sanitizers');
const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Gestión de proyectos
 * servers:
 *   - url: /projects
 *     description: Servidor de Proyectos
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
router.get('/', flexibleAuth, asyncHandler(async (req, res) => {
    const { user_only, environment_id } = req.query;
    const { page, limit } = sanitizePagination(req.query);
    const userOnlyBool = sanitizeBoolean(user_only);

    // Si se autentica con API Key y tiene un proyecto específico, solo mostrar ESE proyecto
    if (req.user?.authMethod === 'api_key' && req.apiKeyProjectId) {
        const project = await projectsRepository.findById(req.apiKeyProjectId);
        if (!project) {
            return res.json({ data: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0 } });
        }
        // Retornar solo el proyecto asociado a la API Key
        return res.json({
            data: [project],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: 1,
                itemsPerPage: limit,
                hasNextPage: false,
                hasPrevPage: false
            }
        });
    }

    // Autenticación normal o API Key global (project_id NULL)
    const result = await projectsRepository.findAll({
        userId: userOnlyBool && req.user ? req.user.id : null,
        page,
        limit,
        environmentId: sanitizeInteger(environment_id)
    });

    res.json(result);
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
 *             environment_id: 1
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
    const { code, name, description, color, environment_id } = req.body;

    // Validate environment exists if provided
    if (environment_id) {
        const { environmentsRepository } = require('../repositories');
        const envExists = await environmentsRepository.exists(environment_id);
        if (!envExists) {
            throw new AppError('Entorno no encontrado', 404);
        }
    }

    const project = await projectsRepository.createProject({
        userId: req.user.id,
        code,
        name,
        description,
        color,
        environmentId: environment_id
    });

    res.status(201).json(project);
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
    const { code, name, description, color, environment_id } = req.body;

    // Check ownership using repository
    const isOwner = await projectsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('Proyecto no encontrado', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    const project = await projectsRepository.updateProject(id, {
        code,
        name,
        description,
        color,
        environmentId: environment_id
    });
    res.json(project);
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

    // Check ownership using repository
    const isOwner = await projectsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('Proyecto no encontrado', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    await projectsRepository.delete(parseInt(id));
    res.json({ message: 'Project deleted successfully' });
}));

module.exports = router;
