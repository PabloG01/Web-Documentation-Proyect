/**
 * Base Repository
 * Abstract class providing common database operations
 */

const { pool } = require('../database');
const { isValidId } = require('../utils/sanitizers');

class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
        this.pool = pool;
    }

    /**
     * Execute a query with parameters
     * @param {string} sql - SQL query string
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async query(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return result;
    }

    /**
     * Find a record by ID
     * @param {number} id - Record ID
     * @returns {Promise<Object|null>} Found record or null
     */
    async findById(id) {
        if (!isValidId(id)) {
            return null;
        }

        const result = await this.query(
            `SELECT * FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create a new record
     * @param {Object} data - Data to insert (column: value pairs)
     * @returns {Promise<Object>} Created record
     */
    async create(data) {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map((_, i) => `$${i + 1}`);

        const result = await this.query(
            `INSERT INTO ${this.tableName} (${columns.join(', ')}) 
             VALUES (${placeholders.join(', ')}) 
             RETURNING *`,
            values
        );
        return result.rows[0];
    }

    /**
     * Update a record by ID
     * @param {number} id - Record ID
     * @param {Object} data - Data to update (column: value pairs)
     * @returns {Promise<Object|null>} Updated record or null
     */
    async update(id, data) {
        if (!isValidId(id)) {
            return null;
        }

        const columns = Object.keys(data);
        const values = Object.values(data);
        const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

        const result = await this.query(
            `UPDATE ${this.tableName} 
             SET ${setClause} 
             WHERE id = $${columns.length + 1} 
             RETURNING *`,
            [...values, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete a record by ID
     * @param {number} id - Record ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        if (!isValidId(id)) {
            return false;
        }

        const result = await this.query(
            `DELETE FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return result.rowCount > 0;
    }

    /**
     * Check if a record exists
     * @param {number} id - Record ID
     * @returns {Promise<boolean>}
     */
    async exists(id) {
        if (!isValidId(id)) {
            return false;
        }

        const result = await this.query(
            `SELECT 1 FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return result.rows.length > 0;
    }

    /**
     * Check ownership of a record
     * @param {number} id - Record ID
     * @param {number} userId - User ID to check
     * @returns {Promise<boolean|null>} True if user owns the record, null if not found, false if invalid input
     */
    async checkOwnership(id, userId) {
        // Validate inputs to prevent SQL injection
        if (!isValidId(id) || !isValidId(userId)) {
            return false;
        }

        const result = await this.query(
            `SELECT user_id FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) return null; // record not found

        // Safe comparison - both are already validated as integers
        return Number(result.rows[0].user_id) === Number(userId);
    }
}

module.exports = BaseRepository;
