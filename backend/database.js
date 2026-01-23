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

            // Create Users Table (Updated with all OAuth fields)
            await pool.query(`
              CREATE TABLE IF NOT EXISTS users (
                  id SERIAL PRIMARY KEY,
                  username VARCHAR(50) UNIQUE NOT NULL,
                  email VARCHAR(100) UNIQUE NOT NULL,
                  password_hash VARCHAR(255) NOT NULL,
                  active_session_token VARCHAR(64),
                  -- GitHub OAuth
                  github_id VARCHAR(50),
                  github_username VARCHAR(100),
                  github_token TEXT,
                  github_connected_at TIMESTAMP,
                  github_client_id TEXT,
                  github_client_secret TEXT,
                  github_callback_url TEXT,
                  -- Bitbucket OAuth
                  bitbucket_id VARCHAR(50),
                  bitbucket_username VARCHAR(100),
                  bitbucket_token TEXT,
                  bitbucket_refresh_token TEXT,
                  bitbucket_connected_at TIMESTAMP,
                  bitbucket_client_id TEXT,
                  bitbucket_client_secret TEXT,
                  bitbucket_callback_url TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Migration: Add columns if they don't exist (for backward compatibility)
            await pool.query(`
          DO $$ 
          BEGIN 
              -- GitHub Columns
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_id') THEN ALTER TABLE users ADD COLUMN github_id VARCHAR(50); END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_username') THEN ALTER TABLE users ADD COLUMN github_username VARCHAR(100); END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_token') THEN ALTER TABLE users ADD COLUMN github_token TEXT; END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_connected_at') THEN ALTER TABLE users ADD COLUMN github_connected_at TIMESTAMP; END IF;
              
              -- Bitbucket Columns
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_id') THEN ALTER TABLE users ADD COLUMN bitbucket_id VARCHAR(50); END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_username') THEN ALTER TABLE users ADD COLUMN bitbucket_username VARCHAR(100); END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_token') THEN ALTER TABLE users ADD COLUMN bitbucket_token TEXT; END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_refresh_token') THEN ALTER TABLE users ADD COLUMN bitbucket_refresh_token TEXT; END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_connected_at') THEN ALTER TABLE users ADD COLUMN bitbucket_connected_at TIMESTAMP; END IF;
              
              -- OAuth App Credentials
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_client_id') THEN ALTER TABLE users ADD COLUMN github_client_id TEXT; END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_client_secret') THEN ALTER TABLE users ADD COLUMN github_client_secret TEXT; END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_callback_url') THEN ALTER TABLE users ADD COLUMN github_callback_url TEXT; END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_client_id') THEN ALTER TABLE users ADD COLUMN bitbucket_client_id TEXT; END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_client_secret') THEN ALTER TABLE users ADD COLUMN bitbucket_client_secret TEXT; END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bitbucket_callback_url') THEN ALTER TABLE users ADD COLUMN bitbucket_callback_url TEXT; END IF;
              
              -- Session
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='active_session_token') THEN ALTER TABLE users ADD COLUMN active_session_token VARCHAR(64); END IF;
          END $$;
      `);

            // Create Environments Table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS environments (
                  id SERIAL PRIMARY KEY,
                  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                  name VARCHAR(100) NOT NULL,
                  description TEXT,
                  color VARCHAR(7) DEFAULT '#10b981',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);

            // Create Projects Table (Updated with environment_id)
            await pool.query(`
              CREATE TABLE IF NOT EXISTS projects (
                  id SERIAL PRIMARY KEY,
                  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                  environment_id INTEGER REFERENCES environments(id) ON DELETE SET NULL,
                  code VARCHAR(20) NOT NULL,
                  name VARCHAR(100) NOT NULL,
                  description TEXT,
                  color VARCHAR(7) DEFAULT '#6366f1',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Migration for projects
            await pool.query(`
              DO $$ 
              BEGIN 
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='environment_id') THEN
                      ALTER TABLE projects ADD COLUMN environment_id INTEGER REFERENCES environments(id) ON DELETE SET NULL;
                  END IF;
              END $$;
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

            // Create API Specs Table (Updated with source fields)
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

            // Migration for api_specs
            await pool.query(`
              DO $$ 
              BEGIN 
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_specs' AND column_name='source_type') THEN
                      ALTER TABLE api_specs ADD COLUMN source_type VARCHAR(50) DEFAULT 'json';
                  END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_specs' AND column_name='source_code') THEN
                      ALTER TABLE api_specs ADD COLUMN source_code TEXT;
                  END IF;
              END $$;
            `);

            // Create Repo Connections Table (Updated with private repo fields)
            await pool.query(`
              CREATE TABLE IF NOT EXISTS repo_connections (
                  id SERIAL PRIMARY KEY,
                  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                  repo_url VARCHAR(500) NOT NULL,
                  repo_name VARCHAR(200),
                  branch VARCHAR(100) DEFAULT 'main',
                  detected_framework VARCHAR(50),
                  auth_token_encrypted TEXT,
                  is_private BOOLEAN DEFAULT FALSE,
                  last_sync TIMESTAMP,
                  status VARCHAR(20) DEFAULT 'pending',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
          `);

            // Migration for repo_connections
            await pool.query(`
              DO $$ 
              BEGIN 
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repo_connections' AND column_name='auth_token_encrypted') THEN
                      ALTER TABLE repo_connections ADD COLUMN auth_token_encrypted TEXT;
                  END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repo_connections' AND column_name='is_private') THEN
                      ALTER TABLE repo_connections ADD COLUMN is_private BOOLEAN DEFAULT FALSE;
                  END IF;
              END $$;
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


            // Create API Keys Table
            await pool.query(`
              CREATE TABLE IF NOT EXISTS api_keys (
                  id SERIAL PRIMARY KEY,
                  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                  key_hash VARCHAR(255) NOT NULL UNIQUE,
                  name VARCHAR(100) NOT NULL,
                  prefix VARCHAR(20) NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  last_used_at TIMESTAMP,
                  expires_at TIMESTAMP,
                  is_active BOOLEAN DEFAULT true,
                  usage_count INTEGER DEFAULT 0
              )
            `);

            // Migration for api_keys
            await pool.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='project_id') THEN
                        ALTER TABLE api_keys ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='usage_count') THEN
                        ALTER TABLE api_keys ADD COLUMN usage_count INTEGER DEFAULT 0;
                    END IF;
                END $$;
            `);

            // Create indexes for API Keys
            await pool.query(`
              CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
              CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
              CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);
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
