-- Alter pricing_quotes table to replace property_size with detailed numerical inputs
ALTER TABLE pricing_quotes 
DROP COLUMN IF EXISTS property_size;

ALTER TABLE pricing_quotes
ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sqft INTEGER DEFAULT 1000;
