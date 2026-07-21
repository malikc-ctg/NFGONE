

-- 2. Update existing profiles
UPDATE profiles SET role = 'employee' WHERE role = 'contractor';

-- 3. Rename columns in jobs
ALTER TABLE jobs RENAME COLUMN assigned_contractor_id TO assigned_employee_id;
ALTER TABLE jobs RENAME COLUMN contractor_payout_amount TO employee_payout_amount;
ALTER TABLE jobs RENAME COLUMN contractor_started_at TO employee_started_at;
ALTER TABLE jobs RENAME COLUMN contractor_completed_at TO employee_completed_at;

-- 4. Rename columns in other tables
ALTER TABLE job_offers RENAME COLUMN contractor_id TO employee_id;
ALTER TABLE job_photos RENAME COLUMN contractor_id TO employee_id;
ALTER TABLE job_checklists RENAME COLUMN contractor_id TO employee_id;
ALTER TABLE recurring_bookings RENAME COLUMN preferred_contractor_id TO preferred_employee_id;
ALTER TABLE reviews RENAME COLUMN contractor_id TO employee_id;
ALTER TABLE contractor_payouts RENAME COLUMN contractor_id TO employee_id;
ALTER TABLE contractor_documents RENAME COLUMN contractor_id TO employee_id;
ALTER TABLE contractor_availability RENAME COLUMN contractor_id TO employee_id;
ALTER TABLE contractor_availability_overrides RENAME COLUMN contractor_id TO employee_id;
ALTER TABLE contractor_score_history RENAME COLUMN contractor_id TO employee_id;

-- 5. Rename tables
ALTER TABLE contractors RENAME TO employees;
ALTER TABLE contractor_documents RENAME TO employee_documents;
ALTER TABLE contractor_availability RENAME TO employee_availability;
ALTER TABLE contractor_availability_overrides RENAME TO employee_availability_overrides;
ALTER TABLE contractor_payouts RENAME TO employee_payouts;
ALTER TABLE contractor_score_history RENAME TO employee_score_history;

-- 6. Rename Indexes
ALTER INDEX IF EXISTS idx_jobs_assigned_contractor RENAME TO idx_jobs_assigned_employee;
ALTER INDEX IF EXISTS idx_job_offers_contractor_id RENAME TO idx_job_offers_employee_id;
ALTER INDEX IF EXISTS idx_reviews_contractor_id RENAME TO idx_reviews_employee_id;

-- 7. Update RLS Policies
-- Employees
DROP POLICY IF EXISTS "contractors_admin" ON employees;
DROP POLICY IF EXISTS "contractors_own" ON employees;
CREATE POLICY "employees_admin" ON employees FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "employees_own" ON employees FOR SELECT USING (profile_id = auth.uid());

-- Jobs (Updates to existing logic)
DROP POLICY IF EXISTS "jobs_contractor" ON jobs;
CREATE POLICY "jobs_employee" ON jobs FOR SELECT USING (assigned_employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Job Offers
DROP POLICY IF EXISTS "offers_contractor" ON job_offers;
CREATE POLICY "offers_employee" ON job_offers FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Job Photos
DROP POLICY IF EXISTS "photos_contractor_insert" ON job_photos;
DROP POLICY IF EXISTS "photos_contractor_select" ON job_photos;
CREATE POLICY "photos_employee_insert" ON job_photos FOR INSERT WITH CHECK (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));
CREATE POLICY "photos_employee_select" ON job_photos FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Job Checklists
DROP POLICY IF EXISTS "checklists_contractor" ON job_checklists;
CREATE POLICY "checklists_employee" ON job_checklists FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Employee Payouts
DROP POLICY IF EXISTS "payouts_contractor" ON employee_payouts;
CREATE POLICY "payouts_employee" ON employee_payouts FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Employee Availability
DROP POLICY IF EXISTS "availability_contractor" ON employee_availability;
CREATE POLICY "availability_employee" ON employee_availability FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Employee Availability Overrides
DROP POLICY IF EXISTS "overrides_contractor" ON employee_availability_overrides;
CREATE POLICY "overrides_employee" ON employee_availability_overrides FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Employee Documents
DROP POLICY IF EXISTS "docs_contractor" ON employee_documents;
CREATE POLICY "docs_employee" ON employee_documents FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Employee Score History
DROP POLICY IF EXISTS "score_history_contractor" ON employee_score_history;
CREATE POLICY "score_history_employee" ON employee_score_history FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));
