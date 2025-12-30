const express = require('express');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validateCreateDocument, validateUpdateDocument, validateDocumentId } = require('../middleware/validators');
const { createLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Middleware to verify token
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
        console.error('Token verification error:', err);
        next(new AppError('Token inválido', 400));
    }
};

// GET /documents - List all documents (public read)
router.get('/', asyncHandler(async (req, res) => {
    const { project_id } = req.query;
    let query = `
        SELECT documents.*, users.username, projects.name as project_name, projects.code as project_code
        FROM documents
        LEFT JOIN users ON documents.user_id = users.id
        LEFT JOIN projects ON documents.project_id = projects.id
    `;
    let params = [];

    if (project_id) {
        query += ' WHERE documents.project_id = $1';
        params.push(project_id);
    }

    query += ' ORDER BY documents.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
}));

// GET /documents/:id - Get specific document
router.get('/:id', validateDocumentId, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(`
        SELECT documents.*, users.username, projects.name as project_name, projects.code as project_code
        FROM documents
        LEFT JOIN users ON documents.user_id = users.id
        LEFT JOIN projects ON documents.project_id = projects.id
        WHERE documents.id = $1
    `, [id]);

    if (result.rows.length === 0) {
        throw new AppError('Documento no encontrado', 404);
    }

    res.json(result.rows[0]);
}));

// POST /documents - Create document (requires auth)
router.post('/', verifyToken, createLimiter, validateCreateDocument, asyncHandler(async (req, res) => {
    const { project_id, type, title, description, content, version, author } = req.body;

    // Validación 1: El campo project_id es obligatorio
    if (!project_id) {
        throw new AppError('El campo project_id es obligatorio. Debes seleccionar un proyecto.', 400);
    }

    // Validación 2: Verificar que el proyecto existe en la base de datos
    const projectExists = await pool.query('SELECT id FROM projects WHERE id = $1', [project_id]);
    if (projectExists.rows.length === 0) {
        throw new AppError('El proyecto especificado no existe', 404);
    }

    // Validación 3: Verificar campos requeridos del documento
    if (!type || !title || !content) {
        throw new AppError('Los campos type, title y content son obligatorios', 400);
    }

    const result = await pool.query(
        `INSERT INTO documents (project_id, user_id, type, title, description, content, version, author)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [project_id, req.user.id, type, title, description, content, version || '1.0.0', author]
    );

    // Fetch the complete document with JOIN to get project and user info
    const newDoc = await pool.query(`
        SELECT documents.*, users.username, projects.name as project_name, projects.code as project_code
        FROM documents
        LEFT JOIN users ON documents.user_id = users.id
        LEFT JOIN projects ON documents.project_id = projects.id
        WHERE documents.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(newDoc.rows[0]);
}));

// PUT /documents/:id - Update document (owner only)
router.put('/:id', verifyToken, validateDocumentId, validateUpdateDocument, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, content, version, author } = req.body;

    // Check ownership
    const check = await pool.query('SELECT user_id FROM documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        throw new AppError('Documento no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    const result = await pool.query(
        `UPDATE documents 
         SET title = $1, description = $2, content = $3, version = $4, author = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [title, description, content, version, author, id]
    );

    res.json(result.rows[0]);
}));

// DELETE /documents/:id - Delete document (owner only)
router.delete('/:id', verifyToken, validateDocumentId, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const check = await pool.query('SELECT user_id FROM documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        throw new AppError('Documento no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    res.json({ message: 'Document deleted successfully' });
}));

module.exports = router;
