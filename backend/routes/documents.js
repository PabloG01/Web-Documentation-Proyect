const express = require('express');
const { pool } = require('../database');
const router = express.Router();

// Middleware to verify token
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

// GET /documents - List all documents (public read)
router.get('/', async (req, res) => {
    try {
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /documents/:id - Get specific document
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT documents.*, users.username, projects.name as project_name, projects.code as project_code
            FROM documents
            LEFT JOIN users ON documents.user_id = users.id
            LEFT JOIN projects ON documents.project_id = projects.id
            WHERE documents.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /documents - Create document (requires auth)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { project_id, type, title, description, content, version, author } = req.body;

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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /documents/:id - Update document (owner only)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content, version, author } = req.body;

        // Check ownership
        const check = await pool.query('SELECT user_id FROM documents WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        if (check.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await pool.query(
            `UPDATE documents 
             SET title = $1, description = $2, content = $3, version = $4, author = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 RETURNING *`,
            [title, description, content, version, author, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /documents/:id - Delete document (owner only)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const check = await pool.query('SELECT user_id FROM documents WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        if (check.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await pool.query('DELETE FROM documents WHERE id = $1', [id]);
        res.json({ message: 'Document deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
