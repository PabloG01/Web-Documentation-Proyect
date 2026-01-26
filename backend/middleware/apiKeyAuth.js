const crypto = require('crypto');
const { apiKeysRepository } = require('../repositories');
const { AppError, asyncHandler } = require('./errorHandler');

// Cache en memoria para evitar consultas excesivas a DB (TTL 60 segundos)
const keyValidationCache = new Map();
// Cache para el registro de uso (evitar condiciones de carrera)
const usageLogCache = new Map();

/**
 * Middleware que acepta autenticación por API Key O Cookie JWT
 * Primero intenta API Key en header, luego fallback a JWT cookie
 */
const flexibleAuth = async (req, res, next) => {
    // 1. Intentar API Key primero
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
        try {
            // Hash del key recibido
            const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
            const now = Date.now();
            let key;

            // Revisar caché primero
            if (keyValidationCache.has(hash)) {
                const cached = keyValidationCache.get(hash);
                if (now < cached.expiry) {
                    key = cached.key;
                    // Usar caché - No contactamos DB ni actualizamos stats
                } else {
                    // Caché expiró, eliminar entrada
                    keyValidationCache.delete(hash);
                }
            }

            // Si no está en caché o expiró, buscar en DB
            if (!key) {
                key = await apiKeysRepository.findByHash(hash);

                if (!key) {
                    console.log('❌ API Key no encontrada en base de datos');
                    return next(new AppError('API Key inválida', 401));
                }

                // Verificar expiración
                if (key.expires_at && new Date(key.expires_at) < new Date()) {
                    console.log('⏰ API Key expirada:', key.expires_at);
                    return next(new AppError('API Key expirada', 401));
                }

                // Guardar en caché por 60 segundos
                keyValidationCache.set(hash, { key, expiry: now + 60000 });

                // Solo actualizar uso en DB si no se ha actualizado recientemente (en memoria)
                const lastLogTime = usageLogCache.get(hash) || 0;

                // Usar el caché de memoria como fuente de verdad para el debounce (más rápido que DB)
                if (now - lastLogTime > 60000) {
                    const endpoint = req.originalUrl || req.url;
                    const method = req.method;

                    if (method !== 'OPTIONS' && method !== 'HEAD') {
                        // Marcar inmediatamente como activo en caché
                        usageLogCache.set(hash, now);

                        // SOLUCIÓN FINAL: Solo actualizar timestamp, NO incrementar contador de uso
                        // El contador solo se incrementará explícitamente al "Conectar" o verificar
                        apiKeysRepository.updateTimestamp(key.id).catch(err => {
                            console.error('Error updating API key timestamp:', err);
                        });
                    }
                }
            }

            // Autenticado con API Key
            req.user = {
                id: key.user_id,
                authMethod: 'api_key'
            };
            req.apiKeyId = key.id;
            req.apiKeyProjectId = key.project_id; // null si es global, o ID específico

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
        req.apiKeyProjectId = key.project_id; // null si es global, o ID específico

        // Actualizar last_used_at y registrar uso
        const endpoint = req.originalUrl || req.url;
        const method = req.method;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

        apiKeysRepository.updateLastUsed(key.id, endpoint, method, ipAddress).catch(err => {
            console.error('Error updating API key usage:', err);
        });

        next();
    } catch (err) {
        console.error('Error verificando API Key:', err);
        next(new AppError('Error verificando API Key', 500));
    }
};

module.exports = { flexibleAuth, apiKeyOnly };
