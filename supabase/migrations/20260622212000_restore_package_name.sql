-- Restore package_name to pricing_quotes
ALTER TABLE pricing_quotes
ADD COLUMN IF NOT EXISTS package_name VARCHAR(255) DEFAULT 'standard_clean';
