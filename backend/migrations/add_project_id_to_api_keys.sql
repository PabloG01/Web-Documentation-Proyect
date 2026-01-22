-- Migration: Add project_id to api_keys table
-- Date: 2026-01-22
-- Description: Associate API Keys with specific projects (optional)

-- Add project_id column (nullable for backward compatibility)
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;
