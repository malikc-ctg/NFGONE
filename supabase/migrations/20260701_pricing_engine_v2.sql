-- Pricing Engine V2: Add new columns to pricing_quotes for the full rate card system
ALTER TABLE pricing_quotes
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS scope_of_work_text TEXT,
  ADD COLUMN IF NOT EXISTS is_custom_quote BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vacancy_confirmed BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_range BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_max NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS half_bathrooms INTEGER DEFAULT 0;

-- Add full_bathrooms alias (the existing bathrooms column serves as full_bathrooms)
COMMENT ON COLUMN pricing_quotes.bathrooms IS 'Number of full bathrooms';
COMMENT ON COLUMN pricing_quotes.half_bathrooms IS 'Number of half bathrooms';
