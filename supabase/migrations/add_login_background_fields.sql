-- Migration: Add login background customization fields to organizacoes table
-- Date: 2026-01-12
-- Description: Allows tenants to customize their login screen background with image or video

-- Add login_background_url column (stores URL to image or video)
ALTER TABLE organizacoes 
ADD COLUMN IF NOT EXISTS login_background_url TEXT;

-- Add login_background_type column (enum-like check for 'image' or 'video')
ALTER TABLE organizacoes 
ADD COLUMN IF NOT EXISTS login_background_type TEXT 
CHECK (login_background_type IS NULL OR login_background_type IN ('image', 'video'));

-- Comment on columns for documentation
COMMENT ON COLUMN organizacoes.login_background_url IS 'URL for tenant-specific login background (image or video)';
COMMENT ON COLUMN organizacoes.login_background_type IS 'Type of login background: image or video';

-- Grant permissions (adjust as needed for your RLS policies)
-- The existing RLS policies on organizacoes should cover these new columns
