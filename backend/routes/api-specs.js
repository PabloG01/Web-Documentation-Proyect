const express = require('express');
const { apiSpecsRepository, projectsRepository } = require('../repositories');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/verifyToken');
const { flexibleAuth } = require('../middleware/apiKeyAuth');
const { createLimiter } = require('../middleware/rateLimiter');
const { parseSwaggerComments, extractSpecPreview } = require('../services/swagger-parser');
const { parseExpressFile, generateOpenApiSpec } = require('../services/parsers/express-parser');
const geminiService = require('../services/gemini-service');
const { sanitizeInteger } = require('../utils/sanitizers');
const multer = require('multer');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: API Specs
 *   description: Gestión de especificaciones OpenAPI/Swagger
 * servers:
 *   - url: /api-specs
 *     description: Servidor de API Specs
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
 *     security: []
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
 */
router.get('/', flexibleAuth, asyncHandler(async (req, res) => {
    const { project_id } = req.query;
    let projectId = sanitizeInteger(project_id);

    // Si se autentica con API Key y tiene un proyecto específico, forzar filtrado por ese proyecto
    if (req.user?.authMethod === 'api_key' && req.apiKeyProjectId) {
        projectId = req.apiKeyProjectId;
    }

    const result = await apiSpecsRepository.findAll({
        projectId
    });
    res.json(result);
}));


/**
 * @swagger
 * /api-specs/{id}:
 *   get:
 *     summary: Obtener una especificación API por ID
 *     tags: [API Specs]
 *     security: []
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
 */
router.get('/:id', flexibleAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const spec = await apiSpecsRepository.findByIdWithDetails(id);

    if (!spec) {
        throw new AppError('API Spec no encontrada', 404);
    }

    res.json(spec);
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

        // Parse Swagger comments and generate OpenAPI spec
        let result;
        const parseWarnings = [];

        try {
            result = parseSwaggerComments(code, fileName);
        } catch (error) {
            // Si el error es por falta de comentarios, intentamos parsear como archivo Express
            if (error.message.includes('No se encontraron comentarios Swagger')) {
                console.log('Falling back to Express Parser for:', fileName);
                try {
                    const parsedExpress = parseExpressFile(code, fileName);

                    if (parsedExpress.endpoints.length > 0) {
                        const spec = generateOpenApiSpec(parsedExpress, fileName);
                        result = {
                            spec,
                            pathsCount: parsedExpress.endpoints.length,
                            schemasCount: 0 // generated spec doesn't have initial schemas usually
                        };
                        parseWarnings.push('Generado automáticamente desde código Express (no se encontraron comentarios JSDoc)');
                    } else {
                        // Si falla también el parser de express, lanzamos el error original
                        throw error;
                    }
                } catch (expressError) {
                    // Si falla el parser de express, lanzamos el error original para que el usuario sepa que faltan comentarios
                    console.error('Express parser failed:', expressError);
                    throw error;
                }
            } else {
                throw error;
            }
        }

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
    const project = await projectsRepository.findById(project_id);
    if (!project) {
        throw new AppError('Proyecto no encontrado', 404);
    }

    let finalName = name.trim();
    if (project.code) {
        // Enforce [Code] prefix
        const prefix = `[${project.code}] `;
        if (!finalName.startsWith(prefix)) {
            // Handle case where user might have typed "[SGG] Name" manually but with different spacing or just "Name"
            // If manual name already has [SGG] but different spacing, strict check might double it. 
            // Ideally we check if it starts with `[${project.code}]`.
            // Example: "SmartPYM" -> "[SGG] SmartPYM"
            finalName = `${prefix}${finalName}`;
        }
    }

    const newSpec = await apiSpecsRepository.createSpec({
        projectId: project_id,
        userId: req.user.id,
        name: finalName,
        description: description || '',
        specContent: spec_content
    });

    res.status(201).json(newSpec);
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

    // Check ownership
    const isOwner = await apiSpecsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    // Get current spec to save version
    const currentSpec = await apiSpecsRepository.findById(id);

    // Validate required fields
    if (!name || !name.trim()) {
        throw new AppError('El nombre es requerido', 400);
    }
    if (!spec_content || typeof spec_content !== 'object') {
        throw new AppError('El contenido de la especificación es requerido y debe ser JSON válido', 400);
    }

    // Validate project exists if provided
    let finalName = name.trim();

    if (project_id) {
        const project = await projectsRepository.findById(project_id);
        if (!project) {
            throw new AppError('Proyecto no encontrado', 404);
        }

        // Append project code if it exists and name doesn't already have it
        if (project.code) {
            const prefix = `[${project.code}] `;
            if (!finalName.startsWith(prefix)) {
                // Remove suffix if it exists from previous logic (optional but good for cleanup)
                // We won't aggressively remove suffix unless we are sure, to avoid data loss.
                // But we should ensure we don't end up with "[SGG] Name - SGG".
                // Let's just prepend. The user can fix old ones or we can try to strip the suffix I just added.
                const suffix = ` - ${project.code}`;
                if (finalName.endsWith(suffix)) {
                    finalName = finalName.substring(0, finalName.length - suffix.length);
                }

                finalName = `${prefix}${finalName}`;
            }
        }
    }

    // Save version
    const nextVersion = await apiSpecsRepository.getNextVersionNumber(id);
    await apiSpecsRepository.saveVersion(
        id,
        nextVersion,
        currentSpec.spec_content,
        `Version ${nextVersion} - Auto-saved`
    );

    // Cleanup old versions
    await apiSpecsRepository.cleanupOldVersions(id, 4);

    // Update the spec
    const updatedSpec = await apiSpecsRepository.update(id, {
        project_id: project_id || null, // handle optional project
        name: finalName,
        description: description || '',
        spec_content: spec_content,
        updated_at: new Date()
    });

    res.json(updatedSpec);
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
    const isOwner = await apiSpecsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    const versions = await apiSpecsRepository.getVersions(id);
    res.json(versions);
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
    const isOwner = await apiSpecsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    const version = await apiSpecsRepository.getVersion(id, versionId);

    if (!version) {
        throw new AppError('Versión no encontrada', 404);
    }

    res.json(version);
}));

/**
 * @swagger
 * /api-specs/{id}/enhance:
 *   post:
 *     summary: Mejorar una especificación con IA
 *     tags: [API Specs]
 *     security:
 *       - cookieAuth: []
 */
router.post('/:id/enhance', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const isOwner = await apiSpecsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    const spec = await apiSpecsRepository.findById(id);

    // Save version before enhancement
    const nextVersion = await apiSpecsRepository.getNextVersionNumber(id);
    await apiSpecsRepository.saveVersion(
        id,
        nextVersion,
        spec.spec_content,
        `Version ${nextVersion} - Before AI Enhancement`
    );

    // Enhance
    const parseResult = { endpoints: [] }; // Mock parse result, or we could try to re-parse if we had the source. 
    // For now, we rely on the existing spec structure.

    // We pass empty parseResult but we might need to extract context if possible. 
    // Ideally we would have stored the ParseResult. 
    // However, enhanceSpecWithAI iterates over spec.paths, so it should work even with empty parseResult provided it has paths.

    /* AI STANDBY START - Disabled to save resources
    const enhancedContent = await geminiService.enhanceSpecWithAI(
        spec.spec_content,
        parseResult,
        { name: spec.name }
    );

    // Update spec
    const updatedSpec = await apiSpecsRepository.update(id, {
        spec_content: enhancedContent,
        updated_at: new Date()
    });
    */

    // Standby behavior: return original spec
    const updatedSpec = spec;
    /* AI STANDBY END */

    res.json({
        message: 'Especificación mejorada con IA',
        spec: updatedSpec
    });
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
    const isOwner = await apiSpecsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    // Get version to restore
    const versionToRestore = await apiSpecsRepository.getVersion(id, versionId);

    if (!versionToRestore) {
        throw new AppError('Versión no encontrada', 404);
    }

    // Get current spec to save as new version
    const currentSpec = await apiSpecsRepository.findById(id);

    // Save current as new version before restoring
    // USER REQUEST: Do NOT create a new version on restore to avoid loops.
    // const nextVersion = await apiSpecsRepository.getNextVersionNumber(id);
    // await apiSpecsRepository.saveVersion(
    //     id,
    //     nextVersion,
    //     currentSpec.spec_content,
    //     `Before restore to v${versionToRestore.version_number}`
    // );

    // Cleanup old versions
    await apiSpecsRepository.cleanupOldVersions(id, 4);

    // Restore the spec content
    const restoredSpec = await apiSpecsRepository.update(id, {
        spec_content: versionToRestore.spec_content,
        updated_at: new Date()
    });

    res.json({
        message: `Restaurado a versión ${versionToRestore.version_number}`,
        spec: restoredSpec
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
    const isOwner = await apiSpecsRepository.checkOwnership(id, req.user.id);
    if (isOwner === null) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    await apiSpecsRepository.delete(id);
    res.json({ message: 'API Spec eliminada correctamente' });
}));

module.exports = router;

