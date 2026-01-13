const BaseRepository = require('./base.repository');

class UsersRepository extends BaseRepository {
    constructor() {
        super('users');
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        const result = await this.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by username
     */
    async findByUsername(username) {
        const result = await this.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by email or username
     */
    async findByEmailOrUsername(email, username) {
        const result = await this.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        return result.rows[0] || null;
    }

    /**
     * Create new user
     */
    async createUser(username, email, passwordHash) {
        const result = await this.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, passwordHash]
        );
        return result.rows[0];
    }

    /**
     * Update active session token
     */
    async updateSessionToken(userId, sessionToken) {
        await this.query(
            'UPDATE users SET active_session_token = $1 WHERE id = $2',
            [sessionToken, userId]
        );
    }

    /**
     * Get user session token
     */
    async getSessionToken(userId) {
        const result = await this.query(
            'SELECT active_session_token FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0]?.active_session_token || null;
    }

    /**
     * Get GitHub credentials for user
     */
    async getGithubCredentials(userId) {
        const result = await this.query(
            'SELECT github_client_id, github_client_secret, github_callback_url FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    }

    /**
     * Get GitHub connection info
     */
    async getGithubConnection(userId) {
        const result = await this.query(
            'SELECT github_id, github_username, github_token, github_connected_at FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    }

    /**
     * Get Bitbucket credentials for user
     */
    async getBitbucketCredentials(userId) {
        const result = await this.query(
            'SELECT bitbucket_client_id, bitbucket_client_secret, bitbucket_callback_url FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    }

    /**
     * Get Bitbucket connection info
     */
    async getBitbucketConnection(userId) {
        const result = await this.query(
            'SELECT bitbucket_id, bitbucket_username, bitbucket_token, bitbucket_refresh_token, bitbucket_connected_at FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    }
}

module.exports = new UsersRepository();
