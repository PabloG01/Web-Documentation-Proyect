const crypto = require('crypto');
const { apiKeysRepository } = require('../repositories');
const { AppError, asyncHandler } = require('./errorHandler');

/**
 * Middleware que acepta autenticación por API Key O Cookie JWT
 * Primero intenta API Key en header, luego fallback a JWT cookie
 */
const flexibleAuth = async (req, res, next) => {
    // 1. Intentar API Key primero
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
        try {
            console.log('🔍 API Key recibida:', apiKey.substring(0, 20) + '...');

            // Hash del key recibido
            const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
            console.log('🔐 Hash generado:', hash.substring(0, 16) + '...');

            const key = await apiKeysRepository.findByHash(hash);
            console.log('📊 Key encontrada en DB:', key ? 'SÍ' : 'NO');

            if (!key) {
                console.log('❌ API Key no encontrada en base de datos');
                return next(new AppError('API Key inválida', 401));
            }

            console.log('✅ Key válida, user_id:', key.user_id);

            // Verificar expiración
            if (key.expires_at && new Date(key.expires_at) < new Date()) {
                console.log('⏰ API Key expirada:', key.expires_at);
                return next(new AppError('API Key expirada', 401));
            }

            // Autenticado con API Key
            req.user = {
                id: key.user_id,
                authMethod: 'api_key'
            };
            req.apiKeyId = key.id;

            // Actualizar last_used_at (no bloquear request)
            apiKeysRepository.updateLastUsed(key.id).catch(err => {
                console.error('Error updating API key last_used_at:', err);
            });

            return next();
        } catch (err) {
            console.error('Error verificando API Key:', err);
            return next(new AppError('Error verificando API Key', 500));
        }
    }

    // 2. No hay API Key, intentar Cookie JWT (comportamiento actual)
    const { verifyToken } = require('./verifyToken');
    return verifyToken(req, res, next);
};

/**
 * Middleware solo para API Keys (no acepta cookies)
 * Útil para endpoints específicamente de M2M
 */
const apiKeyOnly = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return next(new AppError('Se requiere API Key en header X-API-Key', 401));
    }

    try {
        const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const key = await apiKeysRepository.findByHash(hash);

        if (!key) {
            return next(new AppError('API Key inválida', 401));
        }

        if (key.expires_at && new Date(key.expires_at) < new Date()) {
            return next(new AppError('API Key expirada', 401));
        }

        req.user = {
            id: key.user_id,
            authMethod: 'api_key'
        };
        req.apiKeyId = key.id;

        apiKeysRepository.updateLastUsed(key.id).catch(err => {
            console.error('Error updating API key last_used_at:', err);
        });

        next();
    } catch (err) {
        console.error('Error verificando API Key:', err);
        next(new AppError('Error verificando API Key', 500));
    }
};

module.exports = { flexibleAuth, apiKeyOnly };
