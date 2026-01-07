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
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
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
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
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
