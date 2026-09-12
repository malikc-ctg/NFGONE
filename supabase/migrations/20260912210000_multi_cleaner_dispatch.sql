-- Migration: Multi-Cleaner Dispatch Engine
-- Allows multiple cleaners to be directly dispatched / assigned as a crew to any job

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_employee_ids UUID[] DEFAULT '{}';

-- Index for searching jobs by any assigned cleaner in the array
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_employee_ids ON jobs USING GIN (assigned_employee_ids);

-- Update RLS policy so all assigned employees in the crew can view their assigned jobs
DROP POLICY IF EXISTS "jobs_employee" ON jobs;
CREATE POLICY "jobs_employee" ON jobs FOR SELECT USING (
  assigned_employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  OR (auth.uid() IN (SELECT profile_id FROM employees WHERE id = ANY(COALESCE(jobs.assigned_employee_ids, '{}'))))
);
