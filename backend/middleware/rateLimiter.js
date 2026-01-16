const rateLimit = require('express-rate-limit');

/**
 * Rate limiter estricto para endpoints de autenticación
 * Previene ataques de fuerza bruta en login y registro
 * 
 * Límites:
 * - Máximo 5 intentos por ventana de 15 minutos
 * - Cuenta por IP
 * - Mensajes personalizados en español
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 requests por ventana
    message: {
        error: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos.'
    },
    standardHeaders: true, // Retorna info de rate limit en headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
    handler: (req, res) => {
        console.warn(`Rate limit excedido para IP: ${req.ip} en ruta: ${req.path}`);
        res.status(429).json({
            error: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos.'
        });
    }
});

/**
 * Rate limiter para registro de usuarios
 * Evita creación masiva de cuentas
 * 
 * Límites:
 * - Máximo 3 registros por hora por IP
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 1000, // Máximo 1000 registros por hora
    message: {
        error: 'Has alcanzado el límite de registros. Por favor, inténtalo de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Rate limit de registro excedido para IP: ${req.ip}`);
        res.status(429).json({
            error: 'Has alcanzado el límite de registros. Por favor, inténtalo de nuevo en 1 hora.'
        });
    }
});

/**
 * Rate limiter general para API
 * Protege contra uso excesivo y ataques DoS
 * 
 * Límites:
 * - Máximo 500 requests por 15 minutos por IP
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 500, // Máximo 500 requests por ventana
    message: {
        error: 'Demasiadas solicitudes desde esta IP. Por favor, inténtalo de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Rate limit API excedido para IP: ${req.ip} en ruta: ${req.path}`);
        res.status(429).json({
            error: 'Demasiadas solicitudes. Por favor, inténtalo de nuevo en 15 minutos.'
        });
    }
});

/**
 * Rate limiter para creación de recursos
 * Previene spam de creación de proyectos y documentos
 * 
 * Límites:
 * - Máximo 20 creaciones por hora
 */
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20, // Máximo 20 creaciones por hora
    message: {
        error: 'Has alcanzado el límite de creación de recursos. Por favor, espera un momento.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Cuenta todos los requests, incluso exitosos
    handler: (req, res) => {
        console.warn(`Rate limit de creación excedido para IP: ${req.ip} en ruta: ${req.path}`);
        res.status(429).json({
            error: 'Has alcanzado el límite de creación de recursos. Por favor, inténtalo de nuevo en 1 hora.'
        });
    }
});

module.exports = {
    authLimiter,
    registerLimiter,
    apiLimiter,
    createLimiter
};
