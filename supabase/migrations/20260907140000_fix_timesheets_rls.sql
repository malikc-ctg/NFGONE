-- Fix employee_timesheets UPDATE policy so employees can update their timesheet and transition status from 'open' to 'completed'
DROP POLICY IF EXISTS "Employees can update their own open timesheets" ON employee_timesheets;

CREATE POLICY "Employees can update their own open timesheets"
ON employee_timesheets FOR UPDATE
USING (
  auth.uid() IN (SELECT profile_id FROM employees WHERE id = employee_timesheets.employee_id)
)
WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM employees WHERE id = employee_timesheets.employee_id)
);
