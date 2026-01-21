const express = require('express');
const { pool } = require('../database');
const { verifyToken } = require('../middleware/verifyToken');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Statistics endpoints for dashboard
 */

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Stats]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: integer
 *                 documents:
 *                   type: integer
 *                 apiSpecs:
 *                   type: integer
 *                 environments:
 *                   type: integer
 *                 repos:
 *                   type: integer
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Execute all count queries in parallel for performance
    const [projectsCount, documentsCount, apiSpecsCount, environmentsCount, reposCount] = await Promise.all([
        pool.query('SELECT COUNT(*)::int as count FROM projects WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*)::int as count FROM documents WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*)::int as count FROM api_specs WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*)::int as count FROM environments WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*)::int as count FROM repo_connections WHERE user_id = $1', [userId])
    ]);

    res.json({
        projects: projectsCount.rows[0].count,
        documents: documentsCount.rows[0].count,
        apiSpecs: apiSpecsCount.rows[0].count,
        environments: environmentsCount.rows[0].count,
        repos: reposCount.rows[0].count
    });
}));

module.exports = router;
