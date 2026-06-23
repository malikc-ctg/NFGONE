-- Alter pricing_quotes table to replace package_name with selected_tasks JSONB array
ALTER TABLE pricing_quotes 
DROP COLUMN IF EXISTS package_name;

ALTER TABLE pricing_quotes
ADD COLUMN IF NOT EXISTS selected_tasks JSONB DEFAULT '[]'::jsonb;
