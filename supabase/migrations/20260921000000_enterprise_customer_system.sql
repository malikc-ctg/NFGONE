-- Enterprise Customer System: Commercial vs Residential Differentiation
-- Migration: 20260921000000_enterprise_customer_system.sql

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'residential';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS commercial_facility_type TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS square_footage NUMERIC;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS accounts_payable_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS accounts_payable_email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS accounts_payable_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_terms TEXT DEFAULT 'due_on_receipt';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS access_code TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alarm_instructions TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS parking_instructions TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pet_details TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS home_bedrooms INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS home_bathrooms NUMERIC;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Index for speedy filtered queries
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);

-- Auto-categorize existing customers who have a company_name as commercial
UPDATE customers
SET customer_type = 'commercial'
WHERE company_name IS NOT NULL AND TRIM(company_name) != '';
