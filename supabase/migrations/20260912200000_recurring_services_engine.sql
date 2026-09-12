-- Sea of Blue — Recurring Services Engine Migration
-- Adds multi-day scheduling, exact time/duration, team assignment, and MRR tracking

ALTER TABLE recurring_bookings
  ADD COLUMN IF NOT EXISTS days_of_week TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_start_time TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 180,
  ADD COLUMN IF NOT EXISTS preferred_team_id UUID REFERENCES contractor_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'per_visit',
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS scope_of_work TEXT,
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

-- Make customer_id nullable in recurring_bookings if commercial-only contracts exist
ALTER TABLE recurring_bookings ALTER COLUMN customer_id DROP NOT NULL;

-- Indexes for recurring lookups and dispatching
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_active ON recurring_bookings(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_next_date ON recurring_bookings(next_job_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_customer ON recurring_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_recurring_booking ON jobs(recurring_booking_id);
