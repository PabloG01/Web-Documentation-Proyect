/**
 * Documents Repository
 * Handles all database operations for the documents table
 */

const BaseRepository = require('./base.repository');

class DocumentsRepository extends BaseRepository {
    constructor() {
        super('documents');
    }

    /**
     * Find all documents with filters and pagination
     * @param {Object} options - Query options
     * @param {number} options.projectId - Filter by project ID
     * @param {number} options.userId - Filter by user ID
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.limit - Items per page (default: 10)
     * @returns {Promise<{data: Array, pagination: Object}>}
     */
    async findAll({ projectId, userId, page = 1, limit = 10 } = {}) {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
        const offset = (pageNum - 1) * limitNum;

        let query = `
            SELECT documents.*, 
                   projects.name as project_name, 
                   projects.code as project_code, 
                   users.username
            FROM documents 
            LEFT JOIN projects ON documents.project_id = projects.id
            LEFT JOIN users ON documents.user_id = users.id
            WHERE 1=1
        `;

        let countQuery = 'SELECT COUNT(*) FROM documents WHERE 1=1';

        const params = [];
        let paramIndex = 1;

        if (projectId) {
            const filter = ` AND documents.project_id = $${paramIndex}`;
            query += filter;
            countQuery += ` AND project_id = $${paramIndex}`;
            params.push(parseInt(projectId));
            paramIndex++;
        }

        if (userId) {
            const filter = ` AND documents.user_id = $${paramIndex}`;
            query += filter;
            countQuery += ` AND user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        query += ` ORDER BY documents.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

        // Execute count and data queries
        const [countResult, dataResult] = await Promise.all([
            this.query(countQuery, params),
            this.query(query, [...params, limitNum, offset])
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
     * Find document by ID with details
     * @param {number} id - Document ID
     * @returns {Promise<Object|null>}
     */
    async findByIdWithDetails(id) {
        const result = await this.query(
            `SELECT documents.*, 
                    projects.name as project_name, 
                    projects.code as project_code, 
                    users.username
             FROM documents 
             LEFT JOIN projects ON documents.project_id = projects.id 
             LEFT JOIN users ON documents.user_id = users.id 
             WHERE documents.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create a new document
     * @param {Object} data - Document data
     */
    async createDocument({ projectId, userId, title, content, type }) {
        const result = await this.query(
            `INSERT INTO documents (project_id, user_id, title, content, type) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [projectId, userId, title, content, type || 'general']
        );
        return result.rows[0];
    }

    // updateDocument removed to use BaseRepository.update logic

}

module.exports = new DocumentsRepository();
