/**
 * Environments Repository
 * Handles all database operations for the environments table
 */

const BaseRepository = require('./base.repository');
const { isValidId } = require('../utils/sanitizers');

class EnvironmentsRepository extends BaseRepository {
    constructor() {
        super('environments');
    }

    /**
     * Find all environments for a user
     * @param {Object} options - Query options
     * @param {number} options.userId - User ID
     */
    async findAll({ userId }) {
        const query = `
            SELECT environments.*, 
                   (SELECT COUNT(*) FROM projects WHERE projects.environment_id = environments.id) as project_count
            FROM environments 
            WHERE user_id = $1 
            ORDER BY created_at ASC
        `;

        const result = await this.query(query, [userId]);
        return result.rows;
    }

    /**
     * Create a new environment
     * @param {Object} data
     */
    async create({ userId, name, description, color }) {
        const result = await this.query(
            `INSERT INTO environments (user_id, name, description, color) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [userId, name, description, color]
        );
        return result.rows[0];
    }

    /**
     * Check if environment exists
     * @param {number} id - Environment ID
     * @returns {boolean}
     */
    async exists(id) {
        if (!isValidId(id)) {
            return false;
        }

        const result = await this.query(
            'SELECT 1 FROM environments WHERE id = $1',
            [id]
        );
        return result.rows.length > 0;
    }

    /**
     * Check if user owns environment
     * @param {number} id - Environment ID
     * @param {number} userId - User ID
     * @returns {boolean}
     */
    async checkOwnership(id, userId) {
        // Validate inputs to prevent SQL injection
        if (!isValidId(id) || !isValidId(userId)) {
            return false;
        }

        const result = await this.query(
            'SELECT 1 FROM environments WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return result.rows.length > 0;
    }
}

module.exports = new EnvironmentsRepository();
