-- Add company_name and contact_title to leads table for commercial contacts
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_title TEXT;

-- Add company_name to customers table for converted commercial leads
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name TEXT;
