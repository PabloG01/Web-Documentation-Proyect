const express = require('express');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validateProject, validateProjectId } = require('../middleware/validators');
const { createLimiter } = require('../middleware/rateLimiter');
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

// GET /projects - List all projects (optionally filter by user) with pagination
router.get('/', asyncHandler(async (req, res) => {
    const { user_only, page = 1, limit = 10 } = req.query;
    
    // Validate and parse pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    let countQuery = 'SELECT COUNT(*) FROM projects';
    let query = 'SELECT projects.*, users.username FROM projects LEFT JOIN users ON projects.user_id = users.id';
    let params = [];
    let countParams = [];

    if (user_only && req.user) {
        query += ' WHERE projects.user_id = $1';
        countQuery += ' WHERE user_id = $1';
        params.push(req.user.id);
        countParams.push(req.user.id);
    }

    query += ' ORDER BY projects.created_at DESC';
    
    // Add pagination
    const paginationParamStart = params.length + 1;
    query += ` LIMIT $${paginationParamStart} OFFSET $${paginationParamStart + 1}`;
    params.push(limitNum, offset);

    // Get total count and paginated results
    const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, countParams),
        pool.query(query, params)
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limitNum);

    res.json({
        data: dataResult.rows,
        pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems,
            itemsPerPage: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        }
    });
}));

// POST /projects - Create project (requires auth)
router.post('/', verifyToken, createLimiter, validateProject, asyncHandler(async (req, res) => {
    const { code, name, description, color } = req.body;

    const result = await pool.query(
        'INSERT INTO projects (user_id, code, name, description, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, code, name, description, color || '#6366f1']
    );

    res.status(201).json(result.rows[0]);
}));

// PUT /projects/:id - Update project (owner only)
router.put('/:id', verifyToken, validateProjectId, validateProject, asyncHandler(async (req, res) => {
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
router.delete('/:id', verifyToken, validateProjectId, asyncHandler(async (req, res) => {
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
