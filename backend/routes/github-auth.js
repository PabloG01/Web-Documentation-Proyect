const express = require('express');
const axios = require('axios');
const { usersRepository, reposRepository } = require('../repositories');
const { encryptToken, decryptToken } = require('../utils/encryption');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/verifyToken');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: GitHub
 *   description: GitHub OAuth integration
 */

/**
 * @swagger
 * /auth/github/setup:
 *   get:
 *     summary: Get user's GitHub OAuth setup
 *     tags: [GitHub]
 */
router.get('/auth/github/setup', verifyToken, asyncHandler(async (req, res) => {
    const user = await usersRepository.getGithubCredentials(req.user.id);
    res.json({
        configured: !!user?.github_client_id,
        clientId: user?.github_client_id ? '***configurado***' : null,
        callbackUrl: user?.github_callback_url || null
    });
}));

/**
 * @swagger
 * /auth/github/setup:
 *   post:
 *     summary: Save user's GitHub OAuth credentials
 *     tags: [GitHub]
 */
router.post('/auth/github/setup', verifyToken, asyncHandler(async (req, res) => {
    const { client_id, client_secret, callback_url } = req.body;

    if (!client_id || !client_secret || !callback_url) {
        throw new AppError('client_id, client_secret y callback_url son requeridos', 400);
    }

    // Encrypt the client_secret
    const encryptedSecret = encryptToken(client_secret);

    // Update via generic update or specific method. Using generic update here.
    await usersRepository.update(req.user.id, {
        github_client_id: client_id,
        github_client_secret: encryptedSecret,
        github_callback_url: callback_url
    });

    res.json({ success: true, message: 'Credenciales de GitHub guardadas' });
}));

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth flow (uses per-user credentials)
 *     tags: [GitHub]
 */
// Initiate GitHub OAuth flow
router.get('/auth/github', verifyToken, asyncHandler(async (req, res) => {
    // Get user's OAuth credentials
    const user = await usersRepository.getGithubCredentials(req.user.id);


    if (!user?.github_client_id || !user?.github_callback_url) {
        throw new AppError('GitHub OAuth no configurado. Configura tus credenciales primero.', 400);
    }

    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');

    const params = new URLSearchParams({
        client_id: user.github_client_id,
        redirect_uri: user.github_callback_url,
        scope: 'repo read:user',
        state: state
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}));

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback (uses per-user credentials)
 *     tags: [GitHub]
 */
router.get('/auth/github/callback', asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
        return res.redirect(`${frontendUrl}/workspace?section=repos&github_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        return res.redirect(`${frontendUrl}/workspace?section=repos&github_error=missing_params`);
    }

    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const userId = stateData.userId;

        if (!userId) {
            return res.redirect(`${frontendUrl}/workspace?section=repos&github_error=invalid_state`);
        }

        // Get user's OAuth credentials
        // Get user's OAuth credentials
        const user = await usersRepository.getGithubCredentials(userId);


        if (!user?.github_client_id || !user?.github_client_secret) {
            return res.redirect(`${frontendUrl}/workspace?section=repos&github_error=not_configured`);
        }

        const clientSecret = decryptToken(user.github_client_secret);

        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: user.github_client_id,
                client_secret: clientSecret,
                code: code
            },
            { headers: { Accept: 'application/json' } }
        );

        const { access_token, error: tokenError } = tokenResponse.data;

        if (tokenError || !access_token) {
            return res.redirect(`${frontendUrl}/workspace?section=repos&github_error=token_exchange_failed`);
        }

        // Get user info from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        const githubUser = userResponse.data;
        const encryptedToken = encryptToken(access_token);

        await usersRepository.update(userId, {
            github_id: githubUser.id.toString(),
            github_username: githubUser.login,
            github_token: encryptedToken,
            github_connected_at: new Date()
        });

        res.redirect(`${frontendUrl}/workspace?section=repos&github_connected=true`);

    } catch (err) {
        console.error('GitHub OAuth error:', err.message);
        res.redirect(`${frontendUrl}/workspace?section=repos&github_error=server_error`);
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
    const user = await usersRepository.getGithubConnection(req.user.id);

    if (!user) {
        throw new AppError('Usuario no encontrado', 404);
    }

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
    await usersRepository.update(req.user.id, {
        github_id: null,
        github_username: null,
        github_token: null,
        github_connected_at: null
    });

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
    const user = await usersRepository.getGithubConnection(req.user.id);

    if (!user?.github_token) {
        throw new AppError('GitHub no conectado. Conecta tu cuenta primero.', 401);
    }

    const token = decryptToken(user.github_token);
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
            await usersRepository.update(req.user.id, {
                github_token: null,
                github_connected_at: null
            });
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
    const user = await usersRepository.getGithubConnection(req.user.id);

    const encryptedToken = user?.github_token;
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
    // Save repo connection to database
    const repoConnection = await reposRepository.createRepo({
        projectId: project_id,
        userId: req.user.id,
        repoUrl: `https://github.com/${owner}/${repo}`,
        repoName: `${owner}/${repo}`,
        branch: analysisResult.branch || branch,
        detectedFramework: analysisResult.framework?.primary || null,
        authTokenEncrypted: null,
        isPrivate: false
    });



    // Save detected files
    await reposRepository.addFiles(repoConnection.id, analysisResult.files);

    res.json({
        success: true,
        repoConnection,
        analysis: analysisResult
    });
}));

module.exports = router;
