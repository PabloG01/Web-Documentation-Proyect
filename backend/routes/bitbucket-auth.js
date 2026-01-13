const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Encryption
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-key-change-this';

const encryptToken = (token) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};

const decryptToken = (encryptedToken) => {
    try {
        const [ivHex, encrypted] = encryptedToken.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('Token decryption failed:', e.message);
        return null;
    }
};

/**
 * @swagger
 * tags:
 *   name: Bitbucket
 *   description: Bitbucket OAuth integration (per-user credentials)
 */

// Get OAuth setup status
router.get('/auth/bitbucket/setup', verifyToken, asyncHandler(async (req, res) => {
    const result = await pool.query(
        'SELECT bitbucket_client_id, bitbucket_callback_url FROM users WHERE id = $1',
        [req.user.id]
    );
    const user = result.rows[0];
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

    await pool.query(
        `UPDATE users 
         SET bitbucket_client_id = $1, bitbucket_client_secret = $2, bitbucket_callback_url = $3
         WHERE id = $4`,
        [client_id, encryptedSecret, callback_url, req.user.id]
    );

    res.json({ success: true, message: 'Credenciales de Bitbucket guardadas' });
}));

// Initiate OAuth flow (per-user credentials)
router.get('/auth/bitbucket', verifyToken, asyncHandler(async (req, res) => {
    const result = await pool.query(
        'SELECT bitbucket_client_id, bitbucket_callback_url FROM users WHERE id = $1',
        [req.user.id]
    );

    const user = result.rows[0];
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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
        const userResult = await pool.query(
            'SELECT bitbucket_client_id, bitbucket_client_secret, bitbucket_callback_url FROM users WHERE id = $1',
            [userId]
        );

        const user = userResult.rows[0];
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

        await pool.query(
            `UPDATE users 
             SET bitbucket_id = $1, bitbucket_username = $2, bitbucket_token = $3, 
                 bitbucket_refresh_token = $4, bitbucket_connected_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [bitbucketUser.uuid, bitbucketUser.username, encryptedToken, encryptedRefresh, userId]
        );

        res.redirect(`${frontendUrl}/workspace?section=repos&bitbucket_connected=true`);

    } catch (err) {
        console.error('Bitbucket OAuth error:', err.response?.data || err.message);
        res.redirect(`${frontendUrl}/workspace?section=repos&bitbucket_error=server_error`);
    }
}));

// Get connection status
router.get('/auth/bitbucket/status', verifyToken, asyncHandler(async (req, res) => {
    const result = await pool.query(
        'SELECT bitbucket_id, bitbucket_username, bitbucket_connected_at FROM users WHERE id = $1',
        [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].bitbucket_id) {
        return res.json({ connected: false });
    }

    res.json({
        connected: true,
        username: result.rows[0].bitbucket_username,
        connectedAt: result.rows[0].bitbucket_connected_at
    });
}));

// Disconnect account
router.post('/auth/bitbucket/disconnect', verifyToken, asyncHandler(async (req, res) => {
    await pool.query(
        `UPDATE users 
         SET bitbucket_id = NULL, bitbucket_username = NULL, bitbucket_token = NULL, 
             bitbucket_refresh_token = NULL, bitbucket_connected_at = NULL
         WHERE id = $1`,
        [req.user.id]
    );
    res.json({ success: true, message: 'Cuenta de Bitbucket desconectada' });
}));

// List repositories
router.get('/repos', verifyToken, asyncHandler(async (req, res) => {
    const { page = 1, pagelen = 25, role = 'member' } = req.query;

    const userResult = await pool.query(
        'SELECT bitbucket_token FROM users WHERE id = $1',
        [req.user.id]
    );

    if (!userResult.rows[0]?.bitbucket_token) {
        throw new AppError('Bitbucket no conectado', 401);
    }

    const token = decryptToken(userResult.rows[0].bitbucket_token);
    if (!token) {
        throw new AppError('Error al acceder a Bitbucket. Reconecta tu cuenta.', 401);
    }

    try {
        const response = await axios.get('https://api.bitbucket.org/2.0/repositories', {
            headers: {
                Authorization: `Bearer ${token}`
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
            await pool.query(
                'UPDATE users SET bitbucket_token = NULL, bitbucket_refresh_token = NULL WHERE id = $1',
                [req.user.id]
            );
            throw new AppError('Token de Bitbucket expirado. Reconecta tu cuenta.', 401);
        }

        throw new AppError('Error al obtener repositorios de Bitbucket', 500);
    }
}));

// Analyze a Bitbucket repository
router.post('/repos/:workspace/:repo/analyze', verifyToken, asyncHandler(async (req, res) => {
    const { workspace, repo } = req.params;
    const { project_id, branch = 'main' } = req.body;

    const userResult = await pool.query(
        'SELECT bitbucket_token FROM users WHERE id = $1',
        [req.user.id]
    );

    if (!userResult.rows[0]?.bitbucket_token) {
        throw new AppError('Bitbucket no conectado', 401);
    }

    const token = decryptToken(userResult.rows[0].bitbucket_token);
    if (!token) {
        throw new AppError('Error de autenticación con Bitbucket', 401);
    }

    // For now, use the HTTPS clone URL with token
    const cloneUrl = `https://x-token-auth:${token}@bitbucket.org/${workspace}/${repo}.git`;

    // Use existing repo analyzer
    const repoAnalyzer = require('../services/repo-analyzer');

    try {
        const result = await repoAnalyzer.analyzeRepository(cloneUrl, branch);

        // Save to database (similar to github flow)
        const repoInsert = await pool.query(
            `INSERT INTO repo_connections (project_id, user_id, repo_url, repo_name, branch, detected_framework, status, last_sync)
             VALUES ($1, $2, $3, $4, $5, $6, 'analyzed', CURRENT_TIMESTAMP)
             RETURNING id`,
            [
                project_id || null,
                req.user.id,
                `https://bitbucket.org/${workspace}/${repo}`,
                `${workspace}/${repo}`,
                branch,
                result.framework || 'unknown'
            ]
        );

        const repoConnectionId = repoInsert.rows[0].id;

        // Insert files
        for (const file of result.files || []) {
            await pool.query(
                `INSERT INTO repo_files (repo_connection_id, file_path, file_type, has_swagger_comments, endpoints_count, quality_score, parsed_content)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    repoConnectionId,
                    file.path,
                    file.type || 'unknown',
                    file.hasSwaggerComments || false,
                    file.endpointsCount || 0,
                    file.qualityScore || 0,
                    file.parsedContent || null
                ]
            );
        }

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
