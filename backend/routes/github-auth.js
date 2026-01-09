const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback';

// Simple encryption for tokens (use a proper solution in production)
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-key-change-this';

function encryptToken(token) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encryptedToken) {
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

// Middleware to verify JWT token
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
        next(new AppError('Token inválido', 400));
    }
};

/**
 * @swagger
 * tags:
 *   name: GitHub
 *   description: GitHub OAuth integration
 */

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth flow
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       302:
 *         description: Redirects to GitHub authorization page
 */
router.get('/github', verifyToken, (req, res) => {
    if (!GITHUB_CLIENT_ID) {
        return res.status(500).json({
            error: 'GitHub OAuth no configurado. Configure GITHUB_CLIENT_ID en las variables de entorno.'
        });
    }

    // Store user ID in state to retrieve after callback
    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');

    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: GITHUB_CALLBACK_URL,
        scope: 'repo read:user', // Access to public and private repos
        state: state
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [GitHub]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend with success/error
 */
router.get('/github/callback', asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    // Frontend URL to redirect to
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
        return res.redirect(`${frontendUrl}/repos?github_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        return res.redirect(`${frontendUrl}/repos?github_error=missing_params`);
    }

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        return res.redirect(`${frontendUrl}/repos?github_error=not_configured`);
    }

    try {
        // Decode state to get user ID
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const userId = stateData.userId;

        if (!userId) {
            return res.redirect(`${frontendUrl}/repos?github_error=invalid_state`);
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code
            },
            {
                headers: {
                    Accept: 'application/json'
                }
            }
        );

        const { access_token, error: tokenError } = tokenResponse.data;

        if (tokenError || !access_token) {
            console.error('GitHub token error:', tokenResponse.data);
            return res.redirect(`${frontendUrl}/repos?github_error=token_exchange_failed`);
        }

        // Get user info from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        const githubUser = userResponse.data;

        // Encrypt and store token
        const encryptedToken = encryptToken(access_token);

        await pool.query(
            `UPDATE users 
             SET github_id = $1, github_username = $2, github_token = $3, github_connected_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [githubUser.id.toString(), githubUser.login, encryptedToken, userId]
        );

        // Redirect to frontend with success
        res.redirect(`${frontendUrl}/repos?github_connected=true`);

    } catch (err) {
        console.error('GitHub OAuth error:', err.message);
        res.redirect(`${frontendUrl}/repos?github_error=server_error`);
    }
}));

/**
 * @swagger
 * /auth/github/status:
 *   get:
 *     summary: Get GitHub connection status
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GitHub connection status
 */
router.get('/github/status', verifyToken, asyncHandler(async (req, res) => {
    const result = await pool.query(
        'SELECT github_id, github_username, github_connected_at FROM users WHERE id = $1',
        [req.user.id]
    );

    if (result.rows.length === 0) {
        throw new AppError('Usuario no encontrado', 404);
    }

    const user = result.rows[0];

    res.json({
        connected: !!user.github_id,
        username: user.github_username,
        connectedAt: user.github_connected_at
    });
}));

/**
 * @swagger
 * /auth/github/disconnect:
 *   post:
 *     summary: Disconnect GitHub account
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GitHub account disconnected
 */
router.post('/github/disconnect', verifyToken, asyncHandler(async (req, res) => {
    await pool.query(
        `UPDATE users 
         SET github_id = NULL, github_username = NULL, github_token = NULL, github_connected_at = NULL
         WHERE id = $1`,
        [req.user.id]
    );

    res.json({ success: true, message: 'Cuenta de GitHub desconectada' });
}));

/**
 * @swagger
 * /github/repos:
 *   get:
 *     summary: List user's GitHub repositories
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 30
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [all, public, private]
 *           default: all
 *     responses:
 *       200:
 *         description: List of repositories
 */
router.get('/repos', verifyToken, asyncHandler(async (req, res) => {
    const { page = 1, per_page = 30, visibility = 'all' } = req.query;

    // Get user's GitHub token
    const userResult = await pool.query(
        'SELECT github_token FROM users WHERE id = $1',
        [req.user.id]
    );

    if (!userResult.rows[0]?.github_token) {
        throw new AppError('GitHub no conectado. Conecta tu cuenta primero.', 401);
    }

    const token = decryptToken(userResult.rows[0].github_token);
    if (!token) {
        throw new AppError('Error al acceder a GitHub. Reconecta tu cuenta.', 401);
    }

    try {
        // Fetch repositories from GitHub
        const response = await axios.get('https://api.github.com/user/repos', {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json'
            },
            params: {
                page,
                per_page,
                visibility,
                sort: 'updated',
                direction: 'desc'
            }
        });

        // Map to simpler format
        const repos = response.data.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.private,
            url: repo.html_url,
            cloneUrl: repo.clone_url,
            defaultBranch: repo.default_branch,
            language: repo.language,
            stars: repo.stargazers_count,
            updatedAt: repo.updated_at,
            owner: {
                login: repo.owner.login,
                avatarUrl: repo.owner.avatar_url
            }
        }));

        res.json({
            repos,
            page: parseInt(page),
            perPage: parseInt(per_page),
            hasMore: repos.length === parseInt(per_page)
        });

    } catch (err) {
        console.error('GitHub API error:', err.response?.data || err.message);

        if (err.response?.status === 401) {
            // Token expired or revoked
            await pool.query(
                'UPDATE users SET github_token = NULL, github_connected_at = NULL WHERE id = $1',
                [req.user.id]
            );
            throw new AppError('Token de GitHub expirado. Reconecta tu cuenta.', 401);
        }

        throw new AppError('Error al obtener repositorios de GitHub', 500);
    }
}));

/**
 * @swagger
 * /github/repos/{owner}/{repo}/analyze:
 *   post:
 *     summary: Analyze a GitHub repository with authentication
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: repo
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *             properties:
 *               project_id:
 *                 type: integer
 *               branch:
 *                 type: string
 *                 default: main
 *     responses:
 *       200:
 *         description: Analysis result
 */
router.post('/repos/:owner/:repo/analyze', verifyToken, asyncHandler(async (req, res) => {
    const { owner, repo } = req.params;
    const { project_id, branch = 'main' } = req.body;

    if (!project_id) {
        throw new AppError('project_id es requerido', 400);
    }

    // Get user's GitHub token
    const userResult = await pool.query(
        'SELECT github_token FROM users WHERE id = $1',
        [req.user.id]
    );

    const encryptedToken = userResult.rows[0]?.github_token;
    let token = null;

    if (encryptedToken) {
        token = decryptToken(encryptedToken);
    }

    // Build the clone URL with token for private repos
    const repoUrl = token
        ? `https://${token}@github.com/${owner}/${repo}.git`
        : `https://github.com/${owner}/${repo}.git`;

    // Use the existing analyzeRepository function
    const { analyzeRepository } = require('../services/repo-analyzer');

    const analysisResult = await analyzeRepository(repoUrl, branch);

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
            `https://github.com/${owner}/${repo}`, // Store public URL, not with token
            `${owner}/${repo}`,
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

module.exports = router;
