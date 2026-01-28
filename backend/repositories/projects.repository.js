/**
 * Projects Repository
 * Handles all database operations for the projects table
 */

const BaseRepository = require('./base.repository');

class ProjectsRepository extends BaseRepository {
    constructor() {
        super('projects');
    }

    async findById(id) {
        const query = `
            SELECT projects.*, users.username,
            (SELECT COUNT(*)::int FROM api_specs WHERE api_specs.project_id = projects.id) as api_count
            FROM projects 
            LEFT JOIN users ON projects.user_id = users.id
            WHERE projects.id = $1
        `;
        const result = await this.query(query, [id]);
        return result.rows[0] || null;
    }

    /**
     * Find all projects with optional user filter and pagination
     * @param {Object} options - Query options
     * @param {number} options.userId - Filter by user ID (optional)
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.limit - Items per page (default: 10, max: 100)
     * @param {number} options.environmentId - Filter by environment (optional)
     * @returns {Promise<{data: Array, pagination: Object}>}
     */
    async findAll({ userId = null, page = 1, limit = 10, environmentId = null } = {}) {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
        const offset = (pageNum - 1) * limitNum;

        let baseWhere = ' WHERE 1=1';
        const params = [];
        let pIdx = 1;

        if (userId) {
            baseWhere += ` AND projects.user_id = $${pIdx++}`;
            params.push(userId);
        }

        // Robust environment filter
        if (environmentId !== undefined && environmentId !== null) {
            if (String(environmentId) === 'null') {
                baseWhere += ` AND projects.environment_id IS NULL`;
            } else {
                baseWhere += ` AND projects.environment_id = $${pIdx++}`;
                params.push(environmentId);
            }
        }

        const countQuery = `SELECT COUNT(*) FROM projects ${baseWhere}`;

        const dataQuery = `
            SELECT projects.*, users.username,
            (SELECT COUNT(*)::int FROM api_specs WHERE api_specs.project_id = projects.id) as api_count
            FROM projects 
            LEFT JOIN users ON projects.user_id = users.id
            ${baseWhere}
            ORDER BY projects.created_at DESC
            LIMIT $${pIdx++} OFFSET $${pIdx}
        `;

        const dataParams = [...params, limitNum, offset];

        try {
            const [countResult, dataResult] = await Promise.all([
                this.query(countQuery, params),
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
        } catch (error) {
            console.error('Error in ProjectsRepository.findAll:', error);
            throw error;
        }
    }

    async createProject({ userId, code, name, description = '', color = '#6366f1', environmentId = null }) {
        const result = await this.query(
            `INSERT INTO projects (user_id, code, name, description, color, environment_id) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [userId, code, name, description, color, environmentId]
        );
        return result.rows[0];
    }

    async updateProject(id, { code, name, description, color, environmentId }) {
        // Build dynamic update
        const fields = [];
        const values = [];
        let idx = 1;

        if (code) { fields.push(`code = $${idx++}`); values.push(code); }
        if (name) { fields.push(`name = $${idx++}`); values.push(name); }
        if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
        if (color) { fields.push(`color = $${idx++}`); values.push(color); }
        if (environmentId !== undefined) { fields.push(`environment_id = $${idx++}`); values.push(environmentId); }

        values.push(id);

        const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

        const result = await this.query(query, values);
        return result.rows[0] || null;
    }
}

module.exports = new ProjectsRepository();
