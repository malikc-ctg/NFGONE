-- Add hourly_wage to employees and allow tier / payout_rate to be nullable or deprecated
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_wage NUMERIC(8,2) DEFAULT 25.00;

-- Set default hourly wage for existing records if null
UPDATE employees SET hourly_wage = 25.00 WHERE hourly_wage IS NULL;
