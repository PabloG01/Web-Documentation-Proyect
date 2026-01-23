-- Migration: Add usage monitoring to API Keys
-- Date: 2026-01-22
-- Description: Add usage counter and usage logs table for API Key monitoring

-- Add usage_count column to api_keys
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Create usage logs table
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    ip_address VARCHAR(45)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id 
ON api_key_usage_logs(api_key_id, used_at DESC);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'api_keys' AND column_name = 'usage_count';

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'api_key_usage_logs'
ORDER BY ordinal_position;
