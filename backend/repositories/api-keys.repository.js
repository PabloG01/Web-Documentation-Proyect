/**
 * API Keys Repository
 * Handles all database operations for the api_keys table
 */

const BaseRepository = require('./base.repository');
const crypto = require('crypto');

class ApiKeysRepository extends BaseRepository {
    constructor() {
        super('api_keys');
    }

    /**
     * Create a new API key
     * @param {Object} data
     * @param {number} data.userId - User ID
     * @param {string} data.name - Key name/description
     * @param {string} data.keyHash - SHA-256 hash of the key
     * @param {string} data.prefix - Key prefix (e.g., sk_abc)
     * @param {Date} data.expiresAt - Optional expiration date
     */
    async create({ userId, name, keyHash, prefix, expiresAt }) {
        const result = await this.query(`
            INSERT INTO api_keys (user_id, name, key_hash, prefix, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, name, prefix, created_at, expires_at, is_active
        `, [userId, name, keyHash, prefix, expiresAt || null]);
        return result.rows[0];
    }

    /**
     * Find API key by hash
     * @param {string} hash - SHA-256 hash of the key
     * @returns {Object|null} API key record
     */
    async findByHash(hash) {
        const result = await this.query(`
            SELECT * FROM api_keys 
            WHERE key_hash = $1 AND is_active = true
        `, [hash]);
        return result.rows[0] || null;
    }

    /**
     * Find all API keys for a user
     * @param {number} userId - User ID
     * @returns {Array} List of API keys (without hashes)
     */
    async findByUser(userId) {
        const result = await this.query(`
            SELECT id, name, prefix, created_at, last_used_at, expires_at, is_active
            FROM api_keys 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [userId]);
        return result.rows;
    }

    /**
     * Update last_used_at timestamp
     * @param {number} id - API key ID
     */
    async updateLastUsed(id) {
        await this.query(`
            UPDATE api_keys 
            SET last_used_at = NOW() 
            WHERE id = $1
        `, [id]);
    }

    /**
     * Revoke (deactivate) an API key
     * @param {number} id - API key ID
     * @param {number} userId - User ID (for ownership check)
     */
    async revoke(id, userId) {
        const result = await this.query(`
            UPDATE api_keys 
            SET is_active = false 
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [id, userId]);
        return result.rows.length > 0;
    }

    /**
     * Delete expired keys (cleanup job)
     */
    async deleteExpired() {
        const result = await this.query(`
            DELETE FROM api_keys 
            WHERE expires_at IS NOT NULL AND expires_at < NOW()
            RETURNING id
        `);
        return result.rows.length;
    }
}

module.exports = new ApiKeysRepository();
