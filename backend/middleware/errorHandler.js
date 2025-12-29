/**
 * Middleware centralizado para manejo de errores
 * Registra los detalles completos en consola pero envía mensajes genéricos al usuario
 */

// Clase personalizada para errores operacionales (esperados)
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Middleware de manejo de errores
const errorHandler = (err, req, res, next) => {
    // Log completo del error en consola para debugging
    console.error('=== ERROR DETAILS ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Path:', req.path);
    console.error('Method:', req.method);
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.error('====================');

    // Determinar el código de estado
    const statusCode = err.statusCode || 500;

    // Si es un error operacional (esperado), podemos enviar el mensaje específico
    if (err.isOperational) {
        return res.status(statusCode).json({
            error: err.message
        });
    }

    // Para errores no operacionales (bugs, errores inesperados),
    // enviamos un mensaje genérico al usuario
    res.status(statusCode).json({
        error: statusCode === 500
            ? 'Error interno del servidor'
            : 'Ha ocurrido un error'
    });
};

// Wrapper para funciones async que automatiza el manejo de errores
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    errorHandler,
    asyncHandler
};
