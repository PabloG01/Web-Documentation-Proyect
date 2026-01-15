const express = require('express');
const crypto = require('crypto');
const { reposRepository, projectsRepository, apiSpecsRepository } = require('../repositories');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/verifyToken');
const { createLimiter } = require('../middleware/rateLimiter');
const {
    analyzeRepository,
    calculateQualityScore,
    getQualityLevel
} = require('../services/repo-analyzer');
const router = express.Router();

// Token encryption for private repos
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-key-change-this';

function encryptToken(token) {
    if (!token) return null;
    try {
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (err) {
        console.error('Token encryption error:', err.message);
        return null;
    }
}

function decryptToken(encryptedToken) {
    if (!encryptedToken) return null;
    try {
        const [ivHex, encrypted] = encryptedToken.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Token decryption error:', err.message);
        return null;
    }
}

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
    const { repo_url, project_id, branch = 'main', auth_token } = req.body;

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
    const projectExists = await projectsRepository.exists(project_id);
    if (!projectExists) {
        throw new AppError('Proyecto no encontrado', 404);
    }

    // Extract repo name from URL
    const repoName = repo_url.split('/').slice(-2).join('/').replace('.git', '');

    // Build clone URL with auth token if provided (for private repos)
    let cloneUrl = repo_url;
    if (auth_token) {
        // Detect platform and format accordingly
        if (repo_url.includes('github.com')) {
            // GitHub: https://TOKEN@github.com/owner/repo.git
            cloneUrl = repo_url.replace('https://github.com', `https://${auth_token}@github.com`);
        } else if (repo_url.includes('bitbucket.org')) {
            // Bitbucket: https://x-token-auth:TOKEN@bitbucket.org/owner/repo.git
            cloneUrl = repo_url.replace('https://bitbucket.org', `https://x-token-auth:${auth_token}@bitbucket.org`);
        } else if (repo_url.includes('gitlab.com')) {
            // GitLab: https://oauth2:TOKEN@gitlab.com/owner/repo.git
            cloneUrl = repo_url.replace('https://gitlab.com', `https://oauth2:${auth_token}@gitlab.com`);
        }
        if (!cloneUrl.endsWith('.git')) {
            cloneUrl += '.git';
        }
    }

    // Analyze the repository
    console.log(`Starting analysis of ${repo_url}...`);
    const analysisResult = await analyzeRepository(cloneUrl, branch);

    if (!analysisResult.success) {
        throw new AppError(analysisResult.error || 'Error al analizar el repositorio', 400);
    }

    // Save repo connection to database with encrypted token
    const encryptedAuthToken = auth_token ? encryptToken(auth_token) : null;
    const isPrivate = !!auth_token;

    const repoConnection = await reposRepository.createRepo({
        projectId: project_id,
        userId: req.user.id,
        repoUrl: repo_url,
        repoName: repoName,
        branch: analysisResult.branch || branch,
        detectedFramework: analysisResult.framework?.primary || null,
        authTokenEncrypted: encryptedAuthToken,
        isPrivate
    });

    // Save detected files
    await reposRepository.addFiles(repoConnection.id, analysisResult.files);

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
    const { project_id, mine } = req.query;

    const result = await reposRepository.findAll({
        // Solo filtrar por userId si mine=true
        userId: mine === 'true' ? req.user.id : undefined,
        projectId: project_id
    });
    res.json(result);
}));

/**
 * @swagger
 * /repos/{id}:
 *   get:
 *     summary: Obtener detalles de un repositorio
 *     tags: [Repositories]
 */
// GET /repos/:id - Get repo details
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Lectura pública - cualquier usuario autenticado puede ver
    const repo = await reposRepository.findByIdWithDetails(id);

    if (!repo) {
        throw new AppError('Repositorio no encontrado', 404);
    }

    // Get files for this repo
    const files = await reposRepository.getFiles(id);

    // Add detailed breakdown to each file
    const filesWithBreakdown = files.map(file => {
        let breakdown = null;
        let suggestions = [];
        let calculatedScore = file.quality_score; // Default to DB value

        if (file.parsed_content) {
            try {
                const spec = typeof file.parsed_content === 'string'
                    ? JSON.parse(file.parsed_content)
                    : file.parsed_content;

                const detailedScore = calculateQualityScore(spec, true);
                breakdown = detailedScore.breakdown;
                suggestions = detailedScore.suggestions;
                calculatedScore = detailedScore.total; // Use calculated score
            } catch (err) {
                console.error('Error parsing spec for breakdown:', err.message);
            }
        }

        return {
            ...file,
            quality_score: calculatedScore, // Override with calculated
            quality_breakdown: breakdown,
            quality_suggestions: suggestions
        };
    });

    res.json({
        repo,
        files: filesWithBreakdown
    });
}));

/**
 * @swagger
 * /repos/{id}/files/{fileId}/generate-spec:
 *   post:
 *     summary: Generar API spec desde un archivo del repo
 *     tags: [Repositories]
 */
// POST /repos/:id/files/:fileId/generate-spec - Generate API spec from repo file
router.post('/:id/files/:fileId/generate-spec', verifyToken, asyncHandler(async (req, res) => {
    const { id, fileId } = req.params;
    const { name, description } = req.body;

    // Get repo and check ownership
    const repo = await reposRepository.findById(id);
    if (!repo) {
        throw new AppError('Repositorio no encontrado', 404);
    }
    const isOwner = await reposRepository.checkOwnership(id, req.user.id);
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    // Get file
    const file = await reposRepository.getFileById(fileId, id);
    if (!file) {
        throw new AppError('Archivo no encontrado', 404);
    }

    if (!file.parsed_content) {
        throw new AppError('El archivo no tiene contenido parseado', 400);
    }

    // Get project code for compact spec naming
    const project = await projectsRepository.findById(repo.project_id);
    const projectCode = project?.code || 'PROJ';

    // Extract filename without extension
    const fileName = file.file_path.split('/').pop().replace(/\.[^/.]+$/, '');

    // Generate compact name: [CODE] repo/file
    const defaultName = `[${projectCode}] ${repo.repo_name.split('/').pop()}/${fileName}`;
    const defaultDescription = `API generada desde ${repo.repo_name}/${file.file_path}${file.has_swagger_comments ? ' (Swagger)' : ' (Inferida)'}`;

    // Create API spec from parsed content
    const newSpec = await apiSpecsRepository.createSpec({
        projectId: repo.project_id,
        userId: req.user.id,
        name: name || defaultName,
        description: description || defaultDescription,
        specContent: file.parsed_content,
        sourceType: file.has_swagger_comments ? 'swagger-comments' : 'inferred'
    });

    // Update repo_file with api_spec_id
    await reposRepository.linkApiSpec(fileId, newSpec.id);

    res.status(201).json(newSpec);
}));

/**
 * @swagger
 * /repos/{id}/resync:
 *   post:
 *     summary: Re-sincronizar un repositorio
 *     tags: [Repositories]
 */
// POST /repos/:id/resync - Resync repository
router.post('/:id/resync', verifyToken, createLimiter, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get repo with auth token
    const repo = await reposRepository.findById(id);

    if (!repo) {
        throw new AppError('Repositorio no encontrado', 404);
    }

    // Check ownership
    const isOwner = await reposRepository.checkOwnership(id, req.user.id);
    if (!isOwner) {
        throw new AppError('No autorizado', 403);
    }

    // Build clone URL with stored token if it's a private repo
    let cloneUrl = repo.repo_url;
    if (repo.is_private && repo.auth_token_encrypted) {
        const authToken = decryptToken(repo.auth_token_encrypted);
        if (authToken) {
            if (cloneUrl.includes('github.com')) {
                cloneUrl = cloneUrl.replace('https://github.com', `https://${authToken}@github.com`);
            } else if (cloneUrl.includes('bitbucket.org')) {
                cloneUrl = cloneUrl.replace('https://bitbucket.org', `https://x-token-auth:${authToken}@bitbucket.org`);
            } else if (cloneUrl.includes('gitlab.com')) {
                cloneUrl = cloneUrl.replace('https://gitlab.com', `https://oauth2:${authToken}@gitlab.com`);
            }
            if (!cloneUrl.endsWith('.git')) {
                cloneUrl += '.git';
            }
        } else {
            console.warn(`Could not decrypt token for repo ${id}, trying without auth`);
        }
    }

    // Re-analyze with proper URL
    const analysisResult = await analyzeRepository(cloneUrl, repo.branch);

    if (!analysisResult.success) {
        throw new AppError(analysisResult.error || 'Error al re-sincronizar', 400);
    }

    // Update repo connection
    await reposRepository.update(id, {
        detected_framework: analysisResult.framework?.primary || null,
        last_sync: new Date(),
        status: 'synced'
    });

    // Delete old files and insert new ones
    await reposRepository.clearFiles(id);
    await reposRepository.addFiles(id, analysisResult.files);

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
// DELETE /repos/:id - Delete repo connection
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const isOwner = await reposRepository.checkOwnership(id, req.user.id);
    if (!isOwner) {
        throw new AppError(isOwner === null ? 'Repositorio no encontrado' : 'No autorizado', isOwner === null ? 404 : 403);
    }

    await reposRepository.delete(id);
    res.json({ message: 'Repositorio eliminado correctamente' });
}));

module.exports = router;
