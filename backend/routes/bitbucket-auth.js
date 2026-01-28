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
 *   name: Bitbucket
 *   description: Bitbucket OAuth integration (per-user credentials)
 * servers:
 *   - url: /bitbucket
 *     description: Servidor de Integración Bitbucket
 */

// Get OAuth setup status
router.get('/auth/bitbucket/setup', verifyToken, asyncHandler(async (req, res) => {
    const user = await usersRepository.getBitbucketCredentials(req.user.id);
    res.json({
        configured: !!user?.bitbucket_client_id,
        clientId: user?.bitbucket_client_id ? '***configurado***' : null,
        callbackUrl: user?.bitbucket_callback_url || null
    });
}));

// Save OAuth credentials
router.post('/auth/bitbucket/setup', verifyToken, asyncHandler(async (req, res) => {
    const { client_id, client_secret, callback_url } = req.body;

    if (!client_id || !client_secret || !callback_url) {
        throw new AppError('client_id, client_secret y callback_url son requeridos', 400);
    }

    const encryptedSecret = encryptToken(client_secret);

    // Using generic update from BaseRepository
    await usersRepository.update(req.user.id, {
        bitbucket_client_id: client_id,
        bitbucket_client_secret: encryptedSecret,
        bitbucket_callback_url: callback_url
    });

    res.json({ success: true, message: 'Credenciales de Bitbucket guardadas' });
}));

// Connect using App Password (Basic Auth)
router.post('/auth/bitbucket/manual', verifyToken, asyncHandler(async (req, res) => {
    const { username, appPassword } = req.body;

    if (!username || !appPassword) {
        throw new AppError('Username y App Password son requeridos', 400);
    }

    if (appPassword.length < 10) {
        throw new AppError('App Password inválido', 400);
    }

    try {
        // Create Basic Auth token
        const basicAuth = Buffer.from(`${username}:${appPassword}`).toString('base64');

        // Validate credentials against Bitbucket API
        const userResponse = await axios.get('https://api.bitbucket.org/2.0/user', {
            headers: {
                Authorization: `Basic ${basicAuth}`
            }
        });

        const bitbucketUser = userResponse.data;

        // Encrypt and save with BASIC: prefix to identify auth type
        const encryptedToken = encryptToken(`BASIC:${basicAuth}`);

        await usersRepository.update(req.user.id, {
            bitbucket_uuid: bitbucketUser.uuid,
            bitbucket_username: bitbucketUser.username,
            bitbucket_token: encryptedToken,
            bitbucket_connected_at: new Date().toISOString(),
            // Mark as manual connection
            bitbucket_client_id: 'MANUAL',
            bitbucket_client_secret: null,
            bitbucket_callback_url: null
        });

        res.json({
            success: true,
            message: 'Conectado a Bitbucket exitosamente',
            user: {
                uuid: bitbucketUser.uuid,
                username: bitbucketUser.username,
                displayName: bitbucketUser.display_name
            }
        });

    } catch (error) {
        console.error('Bitbucket manual connection error:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            throw new AppError('Credenciales inválidas. Verifica tu username y App Password.', 401);
        }

        throw new AppError(
            error.response?.data?.error?.message || 'Error al conectar con Bitbucket',
            error.response?.status || 500
        );
    }
}));

// Initiate OAuth flow (per-user credentials)
router.get('/auth/bitbucket', verifyToken, asyncHandler(async (req, res) => {
    const user = await usersRepository.getBitbucketCredentials(req.user.id);

    if (!user?.bitbucket_client_id || !user?.bitbucket_callback_url) {
        throw new AppError('Bitbucket OAuth no configurado. Configura tus credenciales primero.', 400);
    }

    const state = Buffer.from(JSON.stringify({
        userId: req.user.id,
        timestamp: Date.now()
    })).toString('base64');

    const params = new URLSearchParams({
        client_id: user.bitbucket_client_id,
        redirect_uri: user.bitbucket_callback_url,
        response_type: 'code',
        state: state,
        scope: 'repository account'
    });

    res.redirect(`https://bitbucket.org/site/oauth2/authorize?${params.toString()}`);
}));

// OAuth callback (per-user credentials)
router.get('/auth/bitbucket/callback', asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://172.16.3.254:3000';

    if (error) {
        return res.redirect(`${frontendUrl}/workspace?section=repos&bitbucket_error=${error}`);
    }

    if (!code || !state) {
        return res.redirect(`${frontendUrl}/workspace?section=repos&bitbucket_error=missing_params`);
    }

    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const userId = stateData.userId;

        if (!userId) {
            return res.redirect(`${frontendUrl}/workspace?section=repos&bitbucket_error=invalid_state`);
        }

        // Get user's OAuth credentials
        const user = await usersRepository.getBitbucketCredentials(userId);

        if (!user?.bitbucket_client_id || !user?.bitbucket_client_secret) {
            return res.redirect(`${frontendUrl}/workspace?section=repos&bitbucket_error=not_configured`);
        }

        const clientSecret = decryptToken(user.bitbucket_client_secret);

        // Exchange code for token
        const tokenResponse = await axios.post(
            'https://bitbucket.org/site/oauth2/access_token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: user.bitbucket_callback_url
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                auth: {
                    username: user.bitbucket_client_id,
                    password: clientSecret
                }
            }
        );

        const { access_token, refresh_token } = tokenResponse.data;

        const userResponse = await axios.get('https://api.bitbucket.org/2.0/user', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const bitbucketUser = userResponse.data;
        const encryptedToken = encryptToken(access_token);
        const encryptedRefresh = refresh_token ? encryptToken(refresh_token) : null;


        await usersRepository.update(userId, {
            bitbucket_id: bitbucketUser.uuid,
            bitbucket_username: bitbucketUser.username,
            bitbucket_token: encryptedToken,
            bitbucket_refresh_token: encryptedRefresh,
            bitbucket_connected_at: new Date()
        });

        res.redirect(`${frontendUrl}/workspace?section=repos&bitbucket_connected=true`);

    } catch (err) {
        console.error('Bitbucket OAuth error:', err.response?.data || err.message);
        res.redirect(`${frontendUrl}/workspace?section=repos&bitbucket_error=server_error`);
    }
}));

// Get connection status
router.get('/auth/bitbucket/status', verifyToken, asyncHandler(async (req, res) => {
    const user = await usersRepository.getBitbucketConnection(req.user.id);

    if (!user || !user.bitbucket_id) {
        return res.json({ connected: false });
    }

    res.json({
        connected: true,
        username: user.bitbucket_username,
        connectedAt: user.bitbucket_connected_at
    });
}));

// Disconnect account
router.post('/auth/bitbucket/disconnect', verifyToken, asyncHandler(async (req, res) => {
    await usersRepository.update(req.user.id, {
        bitbucket_id: null,
        bitbucket_username: null,
        bitbucket_token: null,
        bitbucket_refresh_token: null,
        bitbucket_connected_at: null
    });
    res.json({ success: true, message: 'Cuenta de Bitbucket desconectada' });
}));

// List repositories
router.get('/repos', verifyToken, asyncHandler(async (req, res) => {
    const { page = 1, pagelen = 25, role = 'member' } = req.query;

    const user = await usersRepository.getBitbucketConnection(req.user.id);

    if (!user?.bitbucket_token) {
        throw new AppError('Bitbucket no conectado', 401);
    }

    const token = decryptToken(user.bitbucket_token);
    if (!token) {
        throw new AppError('Error al acceder a Bitbucket. Reconecta tu cuenta.', 401);
    }

    try {
        // Detect auth type: Basic (App Password) or Bearer (OAuth)
        const isBasicAuth = token.startsWith('BASIC:');
        const authHeader = isBasicAuth
            ? `Basic ${token.substring(6)}` // Remove 'BASIC:' prefix
            : `Bearer ${token}`;

        const response = await axios.get('https://api.bitbucket.org/2.0/repositories', {
            headers: {
                Authorization: authHeader
            },
            params: {
                role: role,
                page: page,
                pagelen: pagelen,
                sort: '-updated_on'
            }
        });

        const repos = response.data.values.map(repo => ({
            id: repo.uuid,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.is_private,
            defaultBranch: repo.mainbranch?.name || 'main',
            language: repo.language,
            updatedAt: repo.updated_on,
            htmlUrl: repo.links?.html?.href,
            cloneUrl: repo.links?.clone?.find(c => c.name === 'https')?.href,
            workspace: repo.workspace?.slug
        }));

        res.json({
            repos,
            page: parseInt(page),
            pagelen: parseInt(pagelen),
            hasMore: !!response.data.next
        });

    } catch (err) {
        console.error('Bitbucket API error:', err.response?.data || err.message);

        if (err.response?.status === 401) {
            await usersRepository.update(req.user.id, {
                bitbucket_token: null,
                bitbucket_refresh_token: null
            });
            throw new AppError('Token de Bitbucket expirado. Reconecta tu cuenta.', 401);
        }

        throw new AppError('Error al obtener repositorios de Bitbucket', 500);
    }
}));

// Analyze a Bitbucket repository
router.post('/repos/:workspace/:repo/analyze', verifyToken, asyncHandler(async (req, res) => {
    const { workspace, repo } = req.params;
    const { project_id, branch = 'main' } = req.body;

    const user = await usersRepository.getBitbucketConnection(req.user.id);

    if (!user?.bitbucket_token) {
        throw new AppError('Bitbucket no conectado', 401);
    }

    const token = decryptToken(user.bitbucket_token);
    if (!token) {
        throw new AppError('Error de autenticación con Bitbucket', 401);
    }

    // Detect auth type and construct appropriate clone URL
    const isBasicAuth = token.startsWith('BASIC:');
    let cloneUrl;

    if (isBasicAuth) {
        // For Basic Auth (App Password), decode and use username:password
        const basicToken = token.substring(6); // Remove 'BASIC:' prefix
        const decoded = Buffer.from(basicToken, 'base64').toString('utf-8');
        cloneUrl = `https://${decoded}@bitbucket.org/${workspace}/${repo}.git`;
    } else {
        // For OAuth Bearer token
        cloneUrl = `https://x-token-auth:${token}@bitbucket.org/${workspace}/${repo}.git`;
    }

    // Use existing repo analyzer
    const repoAnalyzer = require('../services/repo-analyzer');

    try {
        const result = await repoAnalyzer.analyzeRepository(cloneUrl, branch);

        // Save to database (similar to github flow)
        const repoConnection = await reposRepository.createRepo({
            projectId: project_id || null,
            userId: req.user.id,
            repoUrl: `https://bitbucket.org/${workspace}/${repo}`,
            repoName: `${workspace}/${repo}`,
            branch: branch,
            detectedFramework: result.framework || 'unknown',
            status: 'analyzed'
        });

        const repoConnectionId = repoConnection.id;

        // Insert files
        await reposRepository.addFiles(repoConnectionId, result.files || []);

        res.json({
            success: true,
            repoConnectionId,
            framework: result.framework,
            filesAnalyzed: result.files?.length || 0,
            totalEndpoints: result.files?.reduce((sum, f) => sum + (f.endpointsCount || 0), 0) || 0
        });

    } catch (err) {
        console.error('Bitbucket analysis error:', err);
        throw new AppError('Error al analizar repositorio: ' + err.message, 500);
    }
}));

module.exports = router;
