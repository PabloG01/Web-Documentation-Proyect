const express = require('express');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

// Middleware to verify token (copy from auth.js)
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

// GET /projects - List all projects (optionally filter by user)
router.get('/', asyncHandler(async (req, res) => {
    const { user_only } = req.query;
    let query = 'SELECT projects.*, users.username FROM projects LEFT JOIN users ON projects.user_id = users.id';
    let params = [];

    if (user_only && req.user) {
        query += ' WHERE projects.user_id = $1';
        params.push(req.user.id);
    }

    query += ' ORDER BY projects.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
}));

// POST /projects - Create project (requires auth)
router.post('/', verifyToken, asyncHandler(async (req, res) => {
    const { code, name, description, color } = req.body;

    const result = await pool.query(
        'INSERT INTO projects (user_id, code, name, description, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, code, name, description, color || '#6366f1']
    );

    res.status(201).json(result.rows[0]);
}));

// PUT /projects/:id - Update project (owner only)
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, description, color } = req.body;

    // Check ownership
    const check = await pool.query('SELECT user_id FROM projects WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        throw new AppError('Proyecto no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    const result = await pool.query(
        'UPDATE projects SET code = $1, name = $2, description = $3, color = $4 WHERE id = $5 RETURNING *',
        [code, name, description, color, id]
    );

    res.json(result.rows[0]);
}));

// DELETE /projects/:id - Delete project (owner only)
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check ownership
    const check = await pool.query('SELECT user_id FROM projects WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        throw new AppError('Proyecto no encontrado', 404);
    }
    if (check.rows[0].user_id !== req.user.id) {
        throw new AppError('No autorizado', 403);
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
}));

module.exports = router;
