const express = require('express');
const { pool } = require('../database');
const router = express.Router();

// Middleware to verify token (copy from auth.js)
const verifyToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Access denied' });

    const jwt = require('jsonwebtoken');
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// GET /projects - List all projects (optionally filter by user)
router.get('/', async (req, res) => {
    try {
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /projects - Create project (requires auth)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { code, name, description, color } = req.body;

        const result = await pool.query(
            'INSERT INTO projects (user_id, code, name, description, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, code, name, description, color || '#6366f1']
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /projects/:id - Update project (owner only)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, description, color } = req.body;

        // Check ownership
        const check = await pool.query('SELECT user_id FROM projects WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        if (check.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await pool.query(
            'UPDATE projects SET code = $1, name = $2, description = $3, color = $4 WHERE id = $5 RETURNING *',
            [code, name, description, color, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /projects/:id - Delete project (owner only)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const check = await pool.query('SELECT user_id FROM projects WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        if (check.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await pool.query('DELETE FROM projects WHERE id = $1', [id]);
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
