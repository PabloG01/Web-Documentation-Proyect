const express = require('express');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { createLimiter } = require('../middleware/rateLimiter');
const {
    analyzeRepository,
    calculateQualityScore,
    getQualityLevel
} = require('../services/repo-analyzer');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Repositories
 *   description: Gestión de conexiones a repositorios Git
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RepoConnection:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         project_id:
 *           type: integer
 *         repo_url:
 *           type: string
 *         repo_name:
 *           type: string
 *         branch:
 *           type: string
 *         detected_framework:
 *           type: string
 *         status:
 *           type: string
 *         last_sync:
 *           type: string
 *           format: date-time
 *     RepoAnalysisResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         framework:
 *           type: object
 *         files:
 *           type: array
 *         stats:
 *           type: object
 */

// Middleware to verify token
const verifyToken = (req, res, next) => {
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

/**
 * @swagger
 * /repos/analyze:
 *   post:
 *     summary: Analizar un repositorio desde URL
 *     tags: [Repositories]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repo_url
 *               - project_id
 *             properties:
 *               repo_url:
 *                 type: string
 *                 description: URL del repositorio Git
 *               project_id:
 *                 type: integer
 *                 description: ID del proyecto asociado
 *               branch:
 *                 type: string
 *                 default: main
 *     responses:
 *       200:
 *         description: Análisis completado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RepoAnalysisResult'
 *       400:
 *         description: URL inválida
 */
router.post('/analyze', verifyToken, createLimiter, asyncHandler(async (req, res) => {
    const { repo_url, project_id, branch = 'main' } = req.body;

    // Validate inputs
    if (!repo_url) {
        throw new AppError('La URL del repositorio es requerida', 400);
    }
    if (!project_id) {
        throw new AppError('El proyecto es requerido', 400);
    }

    // Validate URL format
    const urlPattern = /^(https?:\/\/)?(www\.)?(github\.com|gitlab\.com|bitbucket\.org)\/[\w.-]+\/[\w.-]+/i;
    if (!urlPattern.test(repo_url)) {
        throw new AppError('URL de repositorio no válida. Soportamos GitHub, GitLab y Bitbucket', 400);
    }

    // Check project exists
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [project_id]);
    if (projectCheck.rows.length === 0) {
        throw new AppError('Proyecto no encontrado', 404);
    }

    // Extract repo name from URL
    const repoName = repo_url.split('/').slice(-2).join('/').replace('.git', '');

    // Analyze the repository
    console.log(`Starting analysis of ${repo_url}...`);
    const analysisResult = await analyzeRepository(repo_url, branch);

    if (!analysisResult.success) {
        throw new AppError(analysisResult.error || 'Error al analizar el repositorio', 400);
    }

    // Save repo connection to database
    const repoResult = await pool.query(
        `INSERT INTO repo_connections 
         (project_id, user_id, repo_url, repo_name, branch, detected_framework, status, last_sync)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
            project_id,
            req.user.id,
            repo_url,
            repoName,
            analysisResult.branch || branch,
            analysisResult.framework?.primary || null,
            'analyzed'
        ]
    );

    const repoConnection = repoResult.rows[0];

    // Save detected files
    for (const file of analysisResult.files) {
        await pool.query(
            `INSERT INTO repo_files 
             (repo_connection_id, file_path, file_type, has_swagger_comments, 
              endpoints_count, quality_score, parsed_content, last_parsed)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
                repoConnection.id,
                file.path,
                file.method || 'unknown',
                file.hasSwaggerComments,
                file.endpointsCount,
                file.qualityScore || 0,
                file.spec ? JSON.stringify(file.spec) : null
            ]
        );
    }

    res.json({
        success: true,
        repoConnection,
        analysis: analysisResult
    });
}));

/**
 * @swagger
 * /repos:
 *   get:
 *     summary: Listar repositorios conectados
 *     tags: [Repositories]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: Filtrar por proyecto
 *     responses:
 *       200:
 *         description: Lista de repositorios
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    const { project_id } = req.query;

    let query = `
        SELECT rc.*, p.name as project_name, p.code as project_code,
               (SELECT COUNT(*) FROM repo_files WHERE repo_connection_id = rc.id) as files_count
        FROM repo_connections rc
        LEFT JOIN projects p ON rc.project_id = p.id
        WHERE rc.user_id = $1
    `;
    const params = [req.user.id];

    if (project_id) {
        query += ` AND rc.project_id = $2`;
        params.push(project_id);
    }

    query += ' ORDER BY rc.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
}));

/**
 * @swagger
 * /repos/{id}:
 *   get:
 *     summary: Obtener detalles de un repositorio
 *     tags: [Repositories]
 */
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const repoResult = await pool.query(
        `SELECT rc.*, p.name as project_name, p.code as project_code
         FROM repo_connections rc
         LEFT JOIN projects p ON rc.project_id = p.id
         WHERE rc.id = $1 AND rc.user_id = $2`,
        [id, req.user.id]
    );

    if (repoResult.rows.length === 0) {
        throw new AppError('Repositorio no encontrado', 404);
    }

    // Get files for this repo
    const filesResult = await pool.query(
        `SELECT rf.*, 
                CASE WHEN rf.api_spec_id IS NOT NULL THEN true ELSE false END as has_spec
         FROM repo_files rf
         WHERE rf.repo_connection_id = $1
         ORDER BY rf.quality_score DESC`,
        [id]
    );

    res.json({
        repo: repoResult.rows[0],
        files: filesResult.rows
    });
}));

/**
 * @swagger
 * /repos/{id}/files/{fileId}/generate-spec:
 *   post:
 *     summary: Generar API spec desde un archivo del repo
 *     tags: [Repositories]
 */
router.post('/:id/files/:fileId/generate-spec', verifyToken, asyncHandler(async (req, res) => {
    const { id, fileId } = req.params;
    const { name, description } = req.body;

    // Get repo and file
    const repoResult = await pool.query(
        'SELECT * FROM repo_connections WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
    );
    if (repoResult.rows.length === 0) {
        throw new AppError('Repositorio no encontrado', 404);
    }

    const fileResult = await pool.query(
        'SELECT * FROM repo_files WHERE id = $1 AND repo_connection_id = $2',
        [fileId, id]
    );
    if (fileResult.rows.length === 0) {
        throw new AppError('Archivo no encontrado', 404);
    }

    const repo = repoResult.rows[0];
    const file = fileResult.rows[0];

    if (!file.parsed_content) {
        throw new AppError('El archivo no tiene contenido parseado', 400);
    }

    // Create API spec from parsed content
    const specResult = await pool.query(
        `INSERT INTO api_specs 
         (project_id, user_id, name, description, spec_content, source_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            repo.project_id,
            req.user.id,
            name || `API - ${file.file_path}`,
            description || `Generado desde ${repo.repo_name}/${file.file_path}`,
            file.parsed_content,
            file.has_swagger_comments ? 'swagger-comments' : 'inferred'
        ]
    );

    // Update repo_file with api_spec_id
    await pool.query(
        'UPDATE repo_files SET api_spec_id = $1 WHERE id = $2',
        [specResult.rows[0].id, fileId]
    );

    res.status(201).json(specResult.rows[0]);
}));

/**
 * @swagger
 * /repos/{id}/resync:
 *   post:
 *     summary: Re-sincronizar un repositorio
 *     tags: [Repositories]
 */
router.post('/:id/resync', verifyToken, createLimiter, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get repo
    const repoResult = await pool.query(
        'SELECT * FROM repo_connections WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
    );
    if (repoResult.rows.length === 0) {
        throw new AppError('Repositorio no encontrado', 404);
    }

    const repo = repoResult.rows[0];

    // Re-analyze
    const analysisResult = await analyzeRepository(repo.repo_url, repo.branch);

    if (!analysisResult.success) {
        throw new AppError(analysisResult.error || 'Error al re-sincronizar', 400);
    }

    // Update repo connection
    await pool.query(
        `UPDATE repo_connections 
         SET detected_framework = $1, last_sync = CURRENT_TIMESTAMP, status = 'synced'
         WHERE id = $2`,
        [analysisResult.framework?.primary || null, id]
    );

    // Delete old files and insert new ones
    await pool.query('DELETE FROM repo_files WHERE repo_connection_id = $1', [id]);

    for (const file of analysisResult.files) {
        await pool.query(
            `INSERT INTO repo_files 
             (repo_connection_id, file_path, file_type, has_swagger_comments, 
              endpoints_count, quality_score, parsed_content, last_parsed)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
                id,
                file.path,
                file.method || 'unknown',
                file.hasSwaggerComments,
                file.endpointsCount,
                file.qualityScore || 0,
                file.spec ? JSON.stringify(file.spec) : null
            ]
        );
    }

    res.json({
        success: true,
        message: 'Repositorio re-sincronizado',
        analysis: analysisResult
    });
}));

/**
 * @swagger
 * /repos/{id}:
 *   delete:
 *     summary: Eliminar conexión a repositorio
 *     tags: [Repositories]
 */
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const check = await pool.query(
        'SELECT user_id FROM repo_connections WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('Repositorio no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    await pool.query('DELETE FROM repo_connections WHERE id = $1', [id]);
    res.json({ message: 'Repositorio eliminado correctamente' });
}));

module.exports = router;
