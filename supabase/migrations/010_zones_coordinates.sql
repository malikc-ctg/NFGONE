-- Migration: Add coordinates to zones

ALTER TABLE zones ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS longitude FLOAT;
