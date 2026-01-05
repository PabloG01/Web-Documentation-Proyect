const express = require('express');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
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

// Middleware opcional - extrae user si hay token, pero no falla si no hay
const optionalVerifyToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (token) {
        const jwt = require('jsonwebtoken');
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            req.user = verified;
        } catch (err) {
            // Token inválido, pero es opcional - continuar sin user
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
};

// GET /api-specs - List all API specs (visible to all authenticated users)
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    const { project_id } = req.query;

    let query = `
        SELECT api_specs.*, projects.name as project_name, projects.code as project_code,
               users.username as creator_username
        FROM api_specs 
        LEFT JOIN projects ON api_specs.project_id = projects.id
        LEFT JOIN users ON api_specs.user_id = users.id
    `;
    let params = [];
    let paramIndex = 1;

    if (project_id) {
        query += ` WHERE api_specs.project_id = $${paramIndex}`;
        params.push(project_id);
        paramIndex++;
    }

    query += ' ORDER BY api_specs.updated_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
}));

// GET /api-specs/:id - Get a single API spec by ID (visible to all authenticated users)
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(
        `SELECT api_specs.*, projects.name as project_name, projects.code as project_code,
                users.username as creator_username
         FROM api_specs 
         LEFT JOIN projects ON api_specs.project_id = projects.id
         LEFT JOIN users ON api_specs.user_id = users.id
         WHERE api_specs.id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }

    res.json(result.rows[0]);
}));

// POST /api-specs - Create a new API spec
router.post('/', verifyToken, createLimiter, asyncHandler(async (req, res) => {
    const { project_id, name, description, spec_content } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
        throw new AppError('El nombre es requerido', 400);
    }
    if (!spec_content || typeof spec_content !== 'object') {
        throw new AppError('El contenido de la especificación es requerido y debe ser JSON válido', 400);
    }

    // Validate project exists
    if (project_id) {
        const projectCheck = await pool.query(
            'SELECT id FROM projects WHERE id = $1',
            [project_id]
        );
        if (projectCheck.rows.length === 0) {
            throw new AppError('Proyecto no encontrado', 404);
        }
    }

    const result = await pool.query(
        `INSERT INTO api_specs (project_id, user_id, name, description, spec_content) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [project_id || null, req.user.id, name.trim(), description || '', spec_content]
    );

    res.status(201).json(result.rows[0]);
}));

// PUT /api-specs/:id - Update an API spec
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { project_id, name, description, spec_content } = req.body;

    // Check ownership
    const check = await pool.query(
        'SELECT user_id FROM api_specs WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    // Validate required fields
    if (!name || !name.trim()) {
        throw new AppError('El nombre es requerido', 400);
    }
    if (!spec_content || typeof spec_content !== 'object') {
        throw new AppError('El contenido de la especificación es requerido y debe ser JSON válido', 400);
    }

    // Validate project exists if provided
    if (project_id) {
        const projectCheck = await pool.query(
            'SELECT id FROM projects WHERE id = $1',
            [project_id]
        );
        if (projectCheck.rows.length === 0) {
            throw new AppError('Proyecto no encontrado', 404);
        }
    }

    const result = await pool.query(
        `UPDATE api_specs 
         SET project_id = $1, name = $2, description = $3, spec_content = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 
         RETURNING *`,
        [project_id || null, name.trim(), description || '', spec_content, id]
    );

    res.json(result.rows[0]);
}));

// DELETE /api-specs/:id - Delete an API spec
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const check = await pool.query(
        'SELECT user_id FROM api_specs WHERE id = $1',
        [id]
    );
    if (check.rows.length === 0) {
        throw new AppError('API Spec no encontrada', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    await pool.query('DELETE FROM api_specs WHERE id = $1', [id]);
    res.json({ message: 'API Spec eliminada correctamente' });
}));

module.exports = router;
