-- Migration: Add insurance_details to contractors
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS insurance_details JSONB;
