const BaseRepository = require('./base.repository');

class ApiSpecsRepository extends BaseRepository {
    constructor() {
        super('api_specs');
    }

    /**
     * Find all API specs with optional project filter
     */
    async findAll({ projectId } = {}) {
        let query = `
            SELECT api_specs.*, projects.name as project_name, projects.code as project_code,
                   users.username as creator_username
            FROM api_specs 
            LEFT JOIN projects ON api_specs.project_id = projects.id
            LEFT JOIN users ON api_specs.user_id = users.id
        `;
        const params = [];

        if (projectId) {
            query += ` WHERE api_specs.project_id = $1`;
            params.push(projectId);
        }

        query += ' ORDER BY api_specs.updated_at DESC';

        const result = await this.query(query, params);
        return result.rows;
    }

    /**
     * Find API spec by ID with details
     */
    async findByIdWithDetails(id) {
        const result = await this.query(
            `SELECT api_specs.*, projects.name as project_name, projects.code as project_code,
                    users.username as creator_username
             FROM api_specs 
             LEFT JOIN projects ON api_specs.project_id = projects.id
             LEFT JOIN users ON api_specs.user_id = users.id
             WHERE api_specs.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create a new API spec
     */
    async createSpec({ projectId, userId, name, description, specContent, sourceType = 'json' }) {
        const result = await this.query(
            `INSERT INTO api_specs (project_id, user_id, name, description, spec_content, source_type) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [projectId, userId, name, description || '', specContent, sourceType]
        );
        return result.rows[0];
    }

    // ==========================================
    // Version Management
    // ==========================================

    /**
     * Get next version number for a spec
     */
    async getNextVersionNumber(specId) {
        const result = await this.query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM api_spec_versions WHERE api_spec_id = $1',
            [specId]
        );
        return result.rows[0].next_version;
    }

    /**
     * Save a version of the spec
     */
    async saveVersion(specId, versionNumber, specContent, changeSummary) {
        await this.query(
            `INSERT INTO api_spec_versions (api_spec_id, version_number, spec_content, change_summary)
             VALUES ($1, $2, $3, $4)`,
            [specId, versionNumber, specContent, changeSummary]
        );
    }

    /**
     * Cleanup old versions (keep only N latest)
     */
    async cleanupOldVersions(specId, maxVersions = 4) {
        await this.query(
            `DELETE FROM api_spec_versions 
             WHERE api_spec_id = $1 
             AND version_number NOT IN (
                 SELECT version_number FROM api_spec_versions 
                 WHERE api_spec_id = $1 
                 ORDER BY version_number DESC 
                 LIMIT $2
             )`,
            [specId, maxVersions]
        );
    }

    /**
     * Get all versions for a spec
     */
    async getVersions(specId) {
        const result = await this.query(
            `SELECT id, version_number, change_summary, created_at 
             FROM api_spec_versions 
             WHERE api_spec_id = $1 
             ORDER BY version_number DESC`,
            [specId]
        );
        return result.rows;
    }

    /**
     * Get a specific version
     */
    async getVersion(specId, versionId) {
        const result = await this.query(
            `SELECT * FROM api_spec_versions 
             WHERE api_spec_id = $1 AND id = $2`,
            [specId, versionId]
        );
        return result.rows[0] || null;
    }
}

module.exports = new ApiSpecsRepository();
