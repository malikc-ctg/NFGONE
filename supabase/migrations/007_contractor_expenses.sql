-- Migration: 007 Contractor Expenses
-- Create the contractor_expenses table and set up Row Level Security

CREATE TABLE IF NOT EXISTS contractor_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES contractors(id) ON DELETE CASCADE NOT NULL,
  expense_date date NOT NULL,
  category text CHECK (category IN ('supplies', 'gas', 'insurance', 'maintenance', 'other')) NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  description text,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contractor_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Contractors can SELECT their own expenses
DROP POLICY IF EXISTS "contractors_select_own_expenses" ON contractor_expenses;
CREATE POLICY "contractors_select_own_expenses" ON contractor_expenses
  FOR SELECT
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE profile_id = auth.uid()
    )
  );

-- Policy: Contractors can INSERT their own expenses
DROP POLICY IF EXISTS "contractors_insert_own_expenses" ON contractor_expenses;
CREATE POLICY "contractors_insert_own_expenses" ON contractor_expenses
  FOR INSERT
  WITH CHECK (
    contractor_id IN (
      SELECT id FROM contractors WHERE profile_id = auth.uid()
    )
  );

-- Policy: Contractors can UPDATE their own expenses
DROP POLICY IF EXISTS "contractors_update_own_expenses" ON contractor_expenses;
CREATE POLICY "contractors_update_own_expenses" ON contractor_expenses
  FOR UPDATE
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE profile_id = auth.uid()
    )
  );

-- Policy: Contractors can DELETE their own expenses
DROP POLICY IF EXISTS "contractors_delete_own_expenses" ON contractor_expenses;
CREATE POLICY "contractors_delete_own_expenses" ON contractor_expenses
  FOR DELETE
  USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE profile_id = auth.uid()
    )
  );

-- Policy: Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_expenses" ON contractor_expenses;
CREATE POLICY "admins_full_access_expenses" ON contractor_expenses
  FOR ALL
  USING (
    (SELECT (role = 'admin') FROM profiles WHERE id = auth.uid())
  );

-- Create index for faster lookups by contractor_id
CREATE INDEX IF NOT EXISTS idx_contractor_expenses_contractor_id ON contractor_expenses(contractor_id);
-- Create index for faster lookups by date
CREATE INDEX IF NOT EXISTS idx_contractor_expenses_expense_date ON contractor_expenses(expense_date);
