DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timesheet_status') THEN
    CREATE TYPE timesheet_status AS ENUM ('open', 'completed', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS employee_timesheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  total_minutes INTEGER,
  status timesheet_status NOT NULL DEFAULT 'open',
  location_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employee_timesheets_employee_id ON employee_timesheets(employee_id);
CREATE INDEX idx_employee_timesheets_work_date ON employee_timesheets(work_date);

ALTER TABLE employee_timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own timesheets"
ON employee_timesheets FOR SELECT
USING (auth.uid() IN (SELECT profile_id FROM employees WHERE id = employee_timesheets.employee_id));

CREATE POLICY "Employees can insert their own timesheets"
ON employee_timesheets FOR INSERT
WITH CHECK (auth.uid() IN (SELECT profile_id FROM employees WHERE id = employee_timesheets.employee_id));

CREATE POLICY "Employees can update their own open timesheets"
ON employee_timesheets FOR UPDATE
USING (auth.uid() IN (SELECT profile_id FROM employees WHERE id = employee_timesheets.employee_id) AND status = 'open')
WITH CHECK (auth.uid() IN (SELECT profile_id FROM employees WHERE id = employee_timesheets.employee_id) AND status = 'open');

CREATE POLICY "Admins can do everything on timesheets"
ON employee_timesheets FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employee_timesheets_updated_at ON employee_timesheets;
CREATE TRIGGER update_employee_timesheets_updated_at
BEFORE UPDATE ON employee_timesheets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
