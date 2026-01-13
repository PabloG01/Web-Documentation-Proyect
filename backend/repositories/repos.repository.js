const BaseRepository = require('./base.repository');
const { pool } = require('../database');

class ReposRepository extends BaseRepository {
    constructor() {
        super('repo_connections');
    }

    /**
     * Find all repositories with optional filters
     */
    async findAll({ userId, projectId } = {}) {
        const params = [userId];
        let query = `
            SELECT rc.*, p.name as project_name, p.code as project_code,
                   (SELECT COUNT(*) FROM repo_files WHERE repo_connection_id = rc.id) as files_count
            FROM repo_connections rc
            LEFT JOIN projects p ON rc.project_id = p.id
            WHERE rc.user_id = $1
        `;

        if (projectId) {
            query += ` AND rc.project_id = $2`;
            params.push(projectId);
        }

        query += ' ORDER BY rc.created_at DESC';

        const result = await this.query(query, params);
        return result.rows;
    }

    /**
     * Find repository by ID with project details
     */
    async findByIdWithDetails(id, userId) {
        const result = await this.query(
            `SELECT rc.*, p.name as project_name, p.code as project_code
             FROM repo_connections rc
             LEFT JOIN projects p ON rc.project_id = p.id
             WHERE rc.id = $1 AND rc.user_id = $2`,
            [id, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Create a new repository connection
     */
    async createRepo({
        projectId, userId, repoUrl, repoName, branch,
        detectedFramework, authTokenEncrypted, isPrivate
    }) {
        const result = await this.query(
            `INSERT INTO repo_connections 
             (project_id, user_id, repo_url, repo_name, branch, detected_framework, auth_token_encrypted, is_private, status, last_sync)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
             RETURNING *`,
            [
                projectId, userId, repoUrl, repoName, branch,
                detectedFramework, authTokenEncrypted, isPrivate, 'analyzed'
            ]
        );
        return result.rows[0];
    }

    // ==========================================
    // Repo Files Management
    // ==========================================

    /**
     * Get all files for a repository
     */
    async getFiles(repoId) {
        const result = await this.query(
            `SELECT rf.*, 
                    CASE WHEN rf.api_spec_id IS NOT NULL THEN true ELSE false END as has_spec
             FROM repo_files rf
             WHERE rf.repo_connection_id = $1
             ORDER BY rf.quality_score DESC`,
            [repoId]
        );
        return result.rows;
    }

    /**
     * Get a specific file by ID and Repo ID
     */
    async getFileById(fileId, repoId) {
        const result = await this.query(
            'SELECT * FROM repo_files WHERE id = $1 AND repo_connection_id = $2',
            [fileId, repoId]
        );
        return result.rows[0] || null;
    }

    /**
     * Add multiple files to a repository
     */
    async addFiles(repoId, files) {
        // This is a bulk operation, but for simplicity we'll loop sequentially for now 
        // as pg driver basic query doesn't easily support bulk insert returning.
        // Given the low volume of files per repo usually, this is acceptable.
        for (const file of files) {
            await this.query(
                `INSERT INTO repo_files 
                 (repo_connection_id, file_path, file_type, has_swagger_comments, 
                  endpoints_count, quality_score, parsed_content, last_parsed)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
                [
                    repoId,
                    file.path,
                    file.method || 'unknown',
                    file.hasSwaggerComments,
                    file.endpointsCount,
                    file.qualityScore || 0,
                    file.spec ? JSON.stringify(file.spec) : null
                ]
            );
        }
    }

    /**
     * Remove all files for a repository (used during re-sync)
     */
    async clearFiles(repoId) {
        await this.query('DELETE FROM repo_files WHERE repo_connection_id = $1', [repoId]);
    }

    /**
     * Link an API Spec to a repo file
     */
    async linkApiSpec(fileId, specId) {
        await this.query(
            'UPDATE repo_files SET api_spec_id = $1 WHERE id = $2',
            [specId, fileId]
        );
    }
}

module.exports = new ReposRepository();
