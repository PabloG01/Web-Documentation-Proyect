const { body, param, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Middleware para manejar errores de validación
 * Extrae errores del resultado de validación y los lanza como AppError
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map(err => `${err.path}: ${err.msg}`).join('; ');
        throw new AppError(`Validación fallida: ${messages}`, 400);
    }
    next();
};

// ============================================
// VALIDADORES PARA AUTENTICACIÓN
// ============================================

/**
 * Validación para registro de usuarios
 */
const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos')
        .notEmpty().withMessage('El nombre de usuario es obligatorio'),

    body('email')
        .trim()
        .isEmail().withMessage('Debe proporcionar un email válido')
        .normalizeEmail()
        .isLength({ max: 100 }).withMessage('El email no puede exceder 100 caracteres')
        .notEmpty().withMessage('El email es obligatorio'),

    body('password')
        .isLength({ min: 6, max: 100 }).withMessage('La contraseña debe tener entre 6 y 100 caracteres')
        .notEmpty().withMessage('La contraseña es obligatoria'),

    handleValidationErrors
];

/**
 * Validación para login
 */
const validateLogin = [
    body('email')
        .trim()
        .isEmail().withMessage('Debe proporcionar un email válido')
        .normalizeEmail()
        .notEmpty().withMessage('El email es obligatorio'),

    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria'),

    handleValidationErrors
];

// ============================================
// VALIDADORES PARA PROYECTOS
// ============================================

/**
 * Validación para crear/actualizar proyectos
 */
const validateProject = [
    body('code')
        .trim()
        .isLength({ min: 1, max: 10 }).withMessage('El código debe tener entre 1 y 10 caracteres')
        .matches(/^[A-Z0-9-]+$/).withMessage('El código solo puede contener letras mayúsculas, números y guiones')
        .notEmpty().withMessage('El código del proyecto es obligatorio'),

    body('name')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres')
        .notEmpty().withMessage('El nombre del proyecto es obligatorio'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),

    body('color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('El color debe estar en formato hexadecimal (#RRGGBB)'),

    handleValidationErrors
];

/**
 * Validación para ID de proyecto en params
 */
const validateProjectId = [
    param('id')
        .isInt({ min: 1 }).withMessage('El ID del proyecto debe ser un número entero positivo'),

    handleValidationErrors
];

// ============================================
// VALIDADORES PARA DOCUMENTOS
// ============================================

/**
 * Validación para crear documentos
 */
const validateCreateDocument = [
    body('project_id')
        .isInt({ min: 1 }).withMessage('project_id debe ser un número entero positivo')
        .notEmpty().withMessage('El project_id es obligatorio'),

    body('type')
        .trim()
        .isIn(['api', 'usuario', 'tecnica', 'procesos', 'proyecto', 'requisitos'])
        .withMessage('Tipo de documento inválido. Debe ser: api, usuario, tecnica, procesos, proyecto o requisitos'),

    body('title')
        .trim()
        .isLength({ min: 1, max: 200 }).withMessage('El título debe tener entre 1 y 200 caracteres')
        .notEmpty().withMessage('El título es obligatorio'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),

    body('content')
        .trim()
        .isLength({ min: 1, max: 100000 }).withMessage('El contenido debe tener entre 1 y 100,000 caracteres')
        .notEmpty().withMessage('El contenido es obligatorio'),

    // author validation removed as it is handled by user_id


    body('version')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('La versión no puede exceder 20 caracteres'),

    handleValidationErrors
];

/**
 * Validación para actualizar documentos
 */
const validateUpdateDocument = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 }).withMessage('El título debe tener entre 1 y 200 caracteres'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),

    body('content')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100000 }).withMessage('El contenido debe tener entre 1 y 100,000 caracteres'),

    // author validation removed as it is handled by user_id


    body('version')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('La versión no puede exceder 20 caracteres'),

    handleValidationErrors
];

/**
 * Validación para ID de documento en params
 */
const validateDocumentId = [
    param('id')
        .isInt({ min: 1 }).withMessage('El ID del documento debe ser un número entero positivo'),

    handleValidationErrors
];

// ============================================
// EXPORTAR VALIDADORES
// ============================================

module.exports = {
    // Autenticación
    validateRegister,
    validateLogin,

    // Proyectos
    validateProject,
    validateProjectId,

    // Documentos
    validateCreateDocument,
    validateUpdateDocument,
    validateDocumentId,

    // Utilidad
    handleValidationErrors
};
