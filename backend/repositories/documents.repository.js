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
                   projects.user_id as project_owner_id,
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
                    projects.user_id as project_owner_id,
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
    async createDocument({ projectId, userId, title, content, type, description }) {
        const result = await this.query(
            `INSERT INTO documents (project_id, user_id, title, content, type, description, version) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [projectId, userId, title, content, type || 'general', description, 'V1']
        );
        return result.rows[0];
    }

    /**
     * Update document with versioning
     * @param {number} id - Document ID
     * @param {Object} data - Update data
     * @param {number} userId - ID of user performing the update (for version tracking)
     */
    async update(id, data, userId, skipVersioning = false) {
        // 1. Get current document state
        const currentDoc = await this.findById(id);
        if (!currentDoc) return null;

        // Clone data to avoid side effects or immutability issues with req.body
        const updateData = { ...data };

        // 2. Archive current state as a new version
        if (!skipVersioning) {
            // Get next version number
            const maxResult = await this.query(
                'SELECT MAX(version_number) as max_ver FROM document_versions WHERE document_id = $1',
                [id]
            );
            const nextVersion = (parseInt(maxResult.rows[0].max_ver) || 0) + 1;

            // Insert into versions table
            // We track who *archived* this version (the person making the change that forced a backup)
            // Or strictly adhere to "who created this content" - but we don't have that info reliably if not tracked.
            // Let's use userId (the updater) as the creator of the version entry.
            await this.query(
                `INSERT INTO document_versions 
            (document_id, version_number, title, content, created_by)
            VALUES ($1, $2, $3, $4, $5)`,
                [
                    id,
                    nextVersion,
                    currentDoc.title,
                    currentDoc.content,
                    userId || currentDoc.user_id // Fallback to owner if no user provided
                ]
            );

            // Cleanup old versions (keep only 10 latest)
            await this.cleanupOldVersions(id, 10);

            // Auto-update the version string in the main document
            updateData.version = `V${nextVersion + 1}`;
        }

        // 3. Update the live document
        // Remove version field if it exists in data to avoid DB errors (schema doesn't have it locally if changed)
        // actually documents table has 'version' column (string like '1.0.0'). 
        // We might want to auto-bump that string too? The user didn't ask for semantic versioning logic, 
        // just "version history". The database.js shows there is a `version` column VARCHAR(20) DEFAULT '1.0.0'.
        // Let's leave the `version` column management to the user input/frontend for now, 
        // or just increment the internal history version number.

        return await super.update(id, updateData);
    }

    /**
     * Get all versions for a document
     * @param {number} docId
     */
    async getVersions(docId) {
        const result = await this.query(
            `SELECT v.*, u.username as created_by_username
             FROM document_versions v
             LEFT JOIN users u ON v.created_by = u.id
             WHERE v.document_id = $1 
             ORDER BY v.version_number DESC`,
            [docId]
        );
        return result.rows;
    }

    /**
     * Get a specific version
     * @param {number} docId 
     * @param {number} versionId 
     */
    async getVersion(docId, versionId) {
        const result = await this.query(
            `SELECT * FROM document_versions 
             WHERE document_id = $1 AND id = $2`,
            [docId, versionId]
        );
        return result.rows[0];
    }

    /**
     * Restore a specific version
     * @param {number} docId 
     * @param {number} versionId 
     * @param {number} userId - User performing restore
     */
    async restoreVersion(docId, versionId, userId) {
        const version = await this.getVersion(docId, versionId);
        if (!version) return null;

        // Restore content by updating the main document
        // This will automatically save the *current* state as a new version
        // thanks to our overridden update method.
        // UPDATE: User requested to NOT create a new version on restore to avoid loops.
        // So we pass true to skipVersioning.
        return await this.update(docId, {
            title: version.title,
            content: version.content,
            updated_at: new Date()
        }, userId, true);
    }

    /**
     * Cleanup old versions (keep only N latest)
     * @param {number} docId
     * @param {number} maxVersions
     */
    async cleanupOldVersions(docId, maxVersions = 10) {
        await this.query(
            `DELETE FROM document_versions 
             WHERE document_id = $1 
             AND version_number NOT IN (
                 SELECT version_number FROM document_versions 
                 WHERE document_id = $1 
                 ORDER BY version_number DESC 
                 LIMIT $2
             )`,
            [docId, maxVersions]
        );
    }
    /**
     * Check ownership of a record (Document creator OR Project owner)
     * @param {number} id - Record ID
     * @param {number} userId - User ID to check
     * @returns {Promise<boolean|null>} True if user has rights, null if not found
     */
    async checkOwnership(id, userId) {
        if (!id || !userId) return false;

        const result = await this.query(
            `SELECT d.user_id, p.user_id as project_owner_id 
             FROM documents d
             LEFT JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1`,
            [id]
        );

        if (result.rows.length === 0) return null;

        const doc = result.rows[0];
        return Number(doc.user_id) === Number(userId) || Number(doc.project_owner_id) === Number(userId);
    }
    /**
     * Check edit permission (Open Collaboration: Any auth user can edit if doc exists)
     * @param {number} id - Document ID
     * @param {number} userId - User ID (for future role checks)
     * @returns {Promise<boolean>} True if allowed
     */
    async checkEditPermission(id, userId) {
        if (!id) return false;
        // Simple existence check. 
        // In the future, this could allow-list specific users/groups.
        const result = await this.query('SELECT id FROM documents WHERE id = $1', [id]);
        return result.rows.length > 0;
    }
}

module.exports = new DocumentsRepository();
