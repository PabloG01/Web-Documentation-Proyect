const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const initializeDatabase = async () => {
    const maxRetries = 10;
    const retryDelay = 3000; // 3 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempting to connect to database (attempt ${attempt}/${maxRetries})...`);

            // Test the connection first
            await pool.query('SELECT NOW()');
            console.log('Database connection established successfully');

            // Create Users Table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS users (
                  id SERIAL PRIMARY KEY,
                  username VARCHAR(50) UNIQUE NOT NULL,
                  email VARCHAR(100) UNIQUE NOT NULL,
                  password_hash VARCHAR(255) NOT NULL,
                  github_id VARCHAR(50),
                  github_username VARCHAR(100),
                  github_token TEXT,
                  github_connected_at TIMESTAMP,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Add GitHub columns if they don't exist (for existing installations)
            await pool.query(`
          DO $$ 
          BEGIN 
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_id') THEN
                  ALTER TABLE users ADD COLUMN github_id VARCHAR(50);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_username') THEN
                  ALTER TABLE users ADD COLUMN github_username VARCHAR(100);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_token') THEN
                  ALTER TABLE users ADD COLUMN github_token TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_connected_at') THEN
                  ALTER TABLE users ADD COLUMN github_connected_at TIMESTAMP;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_id') THEN
                  ALTER TABLE users ADD COLUMN bitbucket_id VARCHAR(50);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_username') THEN
                  ALTER TABLE users ADD COLUMN bitbucket_username VARCHAR(100);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_token') THEN
                  ALTER TABLE users ADD COLUMN bitbucket_token TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_refresh_token') THEN
                  ALTER TABLE users ADD COLUMN bitbucket_refresh_token TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_connected_at') THEN
                  ALTER TABLE users ADD COLUMN bitbucket_connected_at TIMESTAMP;
              END IF;
              -- Per-user OAuth app credentials (encrypted)
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_client_id') THEN
                  ALTER TABLE users ADD COLUMN github_client_id TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_client_secret') THEN
                  ALTER TABLE users ADD COLUMN github_client_secret TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_callback_url') THEN
                  ALTER TABLE users ADD COLUMN github_callback_url TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_client_id') THEN
                  ALTER TABLE users ADD COLUMN bitbucket_client_id TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_client_secret') THEN
                  ALTER TABLE users ADD COLUMN bitbucket_client_secret TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_callback_url') THEN
                  ALTER TABLE users ADD COLUMN bitbucket_callback_url TEXT;
              END IF;
          END $$;
      `);

            // Create Projects Table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS projects (
                  id SERIAL PRIMARY KEY,
                  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                  code VARCHAR(20) NOT NULL,
                  name VARCHAR(100) NOT NULL,
                  description TEXT,
                  color VARCHAR(7) DEFAULT '#6366f1',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Create Documents Table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS documents (
                  id SERIAL PRIMARY KEY,
                  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                  type VARCHAR(50) NOT NULL,
                  title VARCHAR(150) NOT NULL,
                  description TEXT,
                  content TEXT,
                  version VARCHAR(20) DEFAULT '1.0.0',
                  author VARCHAR(100),
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Create API Specs Table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS api_specs (
                  id SERIAL PRIMARY KEY,
                  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                  name VARCHAR(150) NOT NULL,
                  description TEXT,
                  spec_content JSONB NOT NULL,
                  source_type VARCHAR(50) DEFAULT 'json',
                  source_code TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Create Repo Connections Table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS repo_connections (
                  id SERIAL PRIMARY KEY,
                  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                  repo_url VARCHAR(500) NOT NULL,
                  repo_name VARCHAR(200),
                  branch VARCHAR(100) DEFAULT 'main',
                  detected_framework VARCHAR(50),
                  last_sync TIMESTAMP,
                  status VARCHAR(20) DEFAULT 'pending',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Create Repo Files Table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS repo_files (
                  id SERIAL PRIMARY KEY,
                  repo_connection_id INTEGER REFERENCES repo_connections(id) ON DELETE CASCADE,
                  file_path VARCHAR(500) NOT NULL,
                  file_type VARCHAR(50),
                  has_swagger_comments BOOLEAN DEFAULT FALSE,
                  endpoints_count INTEGER DEFAULT 0,
                  quality_score INTEGER DEFAULT 0,
                  api_spec_id INTEGER REFERENCES api_specs(id) ON DELETE SET NULL,
                  parsed_content JSONB,
                  last_parsed TIMESTAMP,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Create API Spec Versions Table (for version history)
            await pool.query(`
              CREATE TABLE IF NOT EXISTS api_spec_versions (
                  id SERIAL PRIMARY KEY,
                  api_spec_id INTEGER REFERENCES api_specs(id) ON DELETE CASCADE,
                  version_number INTEGER NOT NULL,
                  spec_content JSONB NOT NULL,
                  change_summary VARCHAR(255),
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE(api_spec_id, version_number)
              )
          `);

            // Create index for faster version queries
            await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_spec_versions_api_spec_id 
          ON api_spec_versions(api_spec_id, version_number DESC)
      `);

            console.log('✅ Database tables initialized successfully');
            return; // Success, exit function

        } catch (err) {
            console.error(`❌ Error on attempt ${attempt}/${maxRetries}:`, err.message);

            if (attempt === maxRetries) {
                console.error('❌ Failed to initialize database after maximum retries');
                process.exit(1); // Exit if we can't connect after all retries
            }

            console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
};

module.exports = { pool, initializeDatabase };
