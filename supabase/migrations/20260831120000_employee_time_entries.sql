-- Migration: Employee Time Clock / Timesheets
-- Adds employee_time_entries for clock in/out shift tracking

CREATE TABLE IF NOT EXISTS employee_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT employee_time_entries_clock_out_after_clock_in CHECK (clock_out IS NULL OR clock_out > clock_in)
);

-- Enable RLS
ALTER TABLE employee_time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can SELECT their own time entries
DROP POLICY IF EXISTS "employees_select_own_time_entries" ON employee_time_entries;
CREATE POLICY "employees_select_own_time_entries" ON employee_time_entries
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

-- Policy: Employees can INSERT their own time entries (clock in)
DROP POLICY IF EXISTS "employees_insert_own_time_entries" ON employee_time_entries;
CREATE POLICY "employees_insert_own_time_entries" ON employee_time_entries
  FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

-- Policy: Employees can UPDATE their own time entries (clock out)
DROP POLICY IF EXISTS "employees_update_own_time_entries" ON employee_time_entries;
CREATE POLICY "employees_update_own_time_entries" ON employee_time_entries
  FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

-- Policy: Admins can do everything (view/manage all timesheets)
DROP POLICY IF EXISTS "admins_full_access_time_entries" ON employee_time_entries;
CREATE POLICY "admins_full_access_time_entries" ON employee_time_entries
  FOR ALL
  USING (
    (SELECT (role = 'admin') FROM profiles WHERE id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_time_entries_employee_id ON employee_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_time_entries_clock_in ON employee_time_entries(clock_in);

-- Only one open (not yet clocked out) shift per employee at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_time_entries_one_active
  ON employee_time_entries(employee_id)
  WHERE clock_out IS NULL;
