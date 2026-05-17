-- Sea of Blue Database Schema
-- Run this migration against your Supabase project

-- ============================================================
-- ENUMS (idempotent — safe to re-run)
-- ============================================================

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'contractor', 'customer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE job_status AS ENUM (
  'lead_received','quoted','deposit_paid','confirmed',
  'offered','accepted','assigned','on_the_way',
  'in_progress','completed','reviewed','paid_out',
  'cancelled','rescheduled','no_show','disputed','refunded'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE service_type AS ENUM (
  'standard_clean','deep_clean','move_in_clean','move_out_clean',
  'recurring_standard','recurring_deep'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE time_window AS ENUM ('morning','afternoon','evening'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE day_of_week AS ENUM (
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE offer_status AS ENUM ('pending','accepted','declined','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payout_status AS ENUM ('pending','processing','completed','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE recurring_frequency AS ENUM ('weekly','biweekly','monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  province TEXT DEFAULT 'ON',
  postal_code TEXT,
  zone_id UUID REFERENCES zones(id),
  stripe_customer_id TEXT UNIQUE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  zone_id UUID REFERENCES zones(id),
  tier TEXT DEFAULT 'basic',
  status TEXT DEFAULT 'active',
  payout_rate NUMERIC(4,3) DEFAULT 0.700,
  brings_own_supplies BOOLEAN DEFAULT FALSE,
  has_vehicle BOOLEAN DEFAULT TRUE,
  max_jobs_per_day INTEGER DEFAULT 2,
  score NUMERIC(3,2) DEFAULT 5.00,
  stripe_account_id TEXT,
  background_check_cleared BOOLEAN DEFAULT FALSE,
  insurance_on_file BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contractor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES profiles(id),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS contractor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  time_window time_window NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  UNIQUE(contractor_id, day_of_week, time_window)
);

CREATE TABLE IF NOT EXISTS contractor_availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  time_window time_window NOT NULL,
  is_available BOOLEAN NOT NULL,
  reason TEXT,
  UNIQUE(contractor_id, override_date, time_window)
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT DEFAULT 'lsa',
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  city TEXT,
  service_type service_type,
  preferred_date DATE,
  preferred_window time_window,
  home_bedrooms INTEGER,
  home_bathrooms INTEGER,
  home_size_sqft INTEGER,
  condition TEXT,
  has_pets BOOLEAN DEFAULT FALSE,
  add_ons JSONB DEFAULT '[]',
  notes TEXT,
  quoted_price NUMERIC(8,2),
  status TEXT DEFAULT 'new',
  converted_job_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES leads(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  zone_id UUID NOT NULL REFERENCES zones(id),
  assigned_contractor_id UUID REFERENCES contractors(id),
  service_type service_type NOT NULL,
  status job_status NOT NULL DEFAULT 'lead_received',
  scheduled_date DATE NOT NULL,
  scheduled_window time_window NOT NULL,
  estimated_duration_minutes INTEGER DEFAULT 180,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  access_instructions TEXT,
  home_bedrooms INTEGER,
  home_bathrooms INTEGER,
  home_size_sqft INTEGER,
  has_pets BOOLEAN DEFAULT FALSE,
  add_ons JSONB DEFAULT '[]',
  scope_notes TEXT,
  quoted_price NUMERIC(8,2) NOT NULL,
  final_price NUMERIC(8,2),
  contractor_payout_amount NUMERIC(8,2),
  deposit_amount NUMERIC(8,2),
  deposit_paid_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  contractor_started_at TIMESTAMPTZ,
  contractor_completed_at TIMESTAMPTZ,
  admin_notes TEXT,
  cancellation_reason TEXT,
  dispute_reason TEXT,
  recurring_booking_id UUID,
  is_first_clean BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  status offer_status DEFAULT 'pending',
  offered_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  decline_reason TEXT,
  UNIQUE(job_id, contractor_id)
);

CREATE TABLE IF NOT EXISTS job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  photo_type TEXT NOT NULL,
  room TEXT,
  file_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  checklist_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by_admin UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  payment_type TEXT NOT NULL,
  amount NUMERIC(8,2) NOT NULL,
  currency TEXT DEFAULT 'cad',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contractor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  amount NUMERIC(8,2) NOT NULL,
  payout_rate NUMERIC(4,3) NOT NULL,
  status payout_status DEFAULT 'pending',
  payout_method TEXT DEFAULT 'etransfer',
  payout_reference TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  was_on_time BOOLEAN,
  job_completed_properly BOOLEAN,
  anything_missed TEXT,
  would_book_again BOOLEAN,
  public_comment TEXT,
  private_feedback TEXT,
  google_review_requested BOOLEAN DEFAULT FALSE,
  google_review_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  preferred_contractor_id UUID REFERENCES contractors(id),
  service_type service_type NOT NULL,
  frequency recurring_frequency NOT NULL,
  preferred_day_of_week day_of_week,
  preferred_window time_window,
  address_line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  quoted_price NUMERIC(8,2) NOT NULL,
  discount_rate NUMERIC(4,3) DEFAULT 0,
  add_ons JSONB DEFAULT '[]',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_job_date DATE,
  next_job_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id),
  recipient_phone TEXT,
  recipient_email TEXT,
  channel TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  job_id UUID REFERENCES jobs(id),
  message TEXT,
  sent_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT FALSE,
  error TEXT
);

CREATE TABLE IF NOT EXISTS contractor_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  score_before NUMERIC(3,2),
  score_after NUMERIC(3,2),
  reason TEXT,
  triggered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_contractor ON jobs(assigned_contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_job_offers_job_id ON job_offers(job_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_contractor_id ON job_offers(contractor_id);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_contractor_id ON reviews(contractor_id);

-- ============================================================
-- JOB NUMBER GENERATOR
-- ============================================================

CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TEXT AS $$
DECLARE
  seq INT;
  yr TEXT;
BEGIN
  yr := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq FROM jobs WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  RETURN 'SOB-' || yr || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE jobs ALTER COLUMN job_number SET DEFAULT generate_job_number();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin" ON profiles;
CREATE POLICY "profiles_admin" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zones_read" ON zones;
CREATE POLICY "zones_read" ON zones FOR SELECT USING (true);

DROP POLICY IF EXISTS "zones_admin" ON zones;
CREATE POLICY "zones_admin" ON zones FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_admin" ON customers;
CREATE POLICY "customers_admin" ON customers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "customers_own" ON customers;
CREATE POLICY "customers_own" ON customers FOR SELECT USING (
  profile_id = auth.uid()
);

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contractors_admin" ON contractors;
CREATE POLICY "contractors_admin" ON contractors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "contractors_own" ON contractors;
CREATE POLICY "contractors_own" ON contractors FOR SELECT USING (
  profile_id = auth.uid()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_admin" ON jobs;
CREATE POLICY "jobs_admin" ON jobs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "jobs_contractor" ON jobs;
CREATE POLICY "jobs_contractor" ON jobs FOR SELECT USING (
  assigned_contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

DROP POLICY IF EXISTS "jobs_customer" ON jobs;
CREATE POLICY "jobs_customer" ON jobs FOR SELECT USING (
  customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
);

ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers_admin" ON job_offers;
CREATE POLICY "offers_admin" ON job_offers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "offers_contractor" ON job_offers;
CREATE POLICY "offers_contractor" ON job_offers FOR ALL USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_admin" ON job_photos;
CREATE POLICY "photos_admin" ON job_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "photos_contractor_insert" ON job_photos;
CREATE POLICY "photos_contractor_insert" ON job_photos FOR INSERT WITH CHECK (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

DROP POLICY IF EXISTS "photos_contractor_select" ON job_photos;
CREATE POLICY "photos_contractor_select" ON job_photos FOR SELECT USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklists_admin" ON job_checklists;
CREATE POLICY "checklists_admin" ON job_checklists FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "checklists_contractor" ON job_checklists;
CREATE POLICY "checklists_contractor" ON job_checklists FOR ALL USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_admin" ON payments;
CREATE POLICY "payments_admin" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE contractor_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_admin" ON contractor_payouts;
CREATE POLICY "payouts_admin" ON contractor_payouts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "payouts_contractor" ON contractor_payouts;
CREATE POLICY "payouts_contractor" ON contractor_payouts FOR SELECT USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_admin" ON reviews;
CREATE POLICY "reviews_admin" ON reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "reviews_customer_insert" ON reviews;
CREATE POLICY "reviews_customer_insert" ON reviews FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
);

DROP POLICY IF EXISTS "reviews_read" ON reviews;
CREATE POLICY "reviews_read" ON reviews FOR SELECT USING (true);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_admin" ON leads;
CREATE POLICY "leads_admin" ON leads FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE contractor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_admin" ON contractor_availability;
CREATE POLICY "availability_admin" ON contractor_availability FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "availability_contractor" ON contractor_availability;
CREATE POLICY "availability_contractor" ON contractor_availability FOR ALL USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

ALTER TABLE contractor_availability_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "overrides_admin" ON contractor_availability_overrides;
CREATE POLICY "overrides_admin" ON contractor_availability_overrides FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "overrides_contractor" ON contractor_availability_overrides;
CREATE POLICY "overrides_contractor" ON contractor_availability_overrides FOR ALL USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

ALTER TABLE contractor_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "docs_admin" ON contractor_documents;
CREATE POLICY "docs_admin" ON contractor_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "docs_contractor" ON contractor_documents;
CREATE POLICY "docs_contractor" ON contractor_documents FOR SELECT USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_admin" ON recurring_bookings;
CREATE POLICY "recurring_admin" ON recurring_bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_admin" ON notifications;
CREATE POLICY "notifications_admin" ON notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE contractor_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "score_history_admin" ON contractor_score_history;
CREATE POLICY "score_history_admin" ON contractor_score_history FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "score_history_contractor" ON contractor_score_history;
CREATE POLICY "score_history_contractor" ON contractor_score_history FOR SELECT USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);
