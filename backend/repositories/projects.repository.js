/**
 * Projects Repository
 * Handles all database operations for the projects table
 */

const BaseRepository = require('./base.repository');

class ProjectsRepository extends BaseRepository {
    constructor() {
        super('projects');
    }

    /**
     * Find all projects with optional user filter and pagination
     * @param {Object} options - Query options
     * @param {number} options.userId - Filter by user ID (optional)
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.limit - Items per page (default: 10, max: 100)
     * @returns {Promise<{data: Array, pagination: Object}>}
     */
    async findAll({ userId = null, page = 1, limit = 10 } = {}) {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
        const offset = (pageNum - 1) * limitNum;

        let countQuery = 'SELECT COUNT(*) FROM projects';
        let dataQuery = `
            SELECT projects.*, users.username,
            (SELECT COUNT(*)::int FROM api_specs WHERE api_specs.project_id = projects.id) as api_count
            FROM projects 
            LEFT JOIN users ON projects.user_id = users.id
        `;

        const countParams = [];
        const dataParams = [];

        if (userId) {
            countQuery += ' WHERE user_id = $1';
            dataQuery += ' WHERE projects.user_id = $1';
            countParams.push(userId);
            dataParams.push(userId);
        }

        dataQuery += ' ORDER BY projects.created_at DESC';

        const paginationStart = dataParams.length + 1;
        dataQuery += ` LIMIT $${paginationStart} OFFSET $${paginationStart + 1}`;
        dataParams.push(limitNum, offset);

        const [countResult, dataResult] = await Promise.all([
            this.query(countQuery, countParams),
            this.query(dataQuery, dataParams)
        ]);

        const totalItems = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalItems / limitNum);

        return {
            data: dataResult.rows,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        };
    }

    /**
     * Create a new project
     * @param {Object} data - Project data
     * @param {number} data.userId - Owner user ID
     * @param {string} data.code - Project code
     * @param {string} data.name - Project name
     * @param {string} data.description - Project description (optional)
     * @param {string} data.color - Project color (default: #6366f1)
     * @returns {Promise<Object>} Created project
     */
    async createProject({ userId, code, name, description = '', color = '#6366f1' }) {
        const result = await this.query(
            `INSERT INTO projects (user_id, code, name, description, color) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [userId, code, name, description, color]
        );
        return result.rows[0];
    }

    /**
     * Update a project
     * @param {number} id - Project ID
     * @param {Object} data - Data to update
     * @returns {Promise<Object|null>} Updated project or null
     */
    async updateProject(id, { code, name, description, color }) {
        const result = await this.query(
            `UPDATE projects 
             SET code = $1, name = $2, description = $3, color = $4 
             WHERE id = $5 
             RETURNING *`,
            [code, name, description, color, id]
        );
        return result.rows[0] || null;
    }
}

module.exports = new ProjectsRepository();
