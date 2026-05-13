-- Sea of Blue — Phase 3 Full Schema
-- Depends on: 003_phase3_enums.sql (zone_manager + partner roles must already exist)
-- Run AFTER 003 is fully committed.

-- ============================================================
-- SECTION 1: ZONE MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS zone_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'zone_manager',
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_id, profile_id)
);

CREATE INDEX idx_zone_staff_zone ON zone_staff(zone_id);
CREATE INDEX idx_zone_staff_profile ON zone_staff(profile_id);

-- ============================================================
-- SECTION 2: CONTRACTOR TEAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lead_contractor_id UUID NOT NULL REFERENCES contractors(id),
  zone_id UUID NOT NULL REFERENCES zones(id),
  status TEXT DEFAULT 'active',
  max_jobs_per_day INTEGER DEFAULT 3,
  payout_split JSONB DEFAULT '{"lead": 0.45, "member": 0.25}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contractor_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES contractor_teams(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, contractor_id)
);

CREATE INDEX idx_contractor_teams_zone ON contractor_teams(zone_id);
CREATE INDEX idx_contractor_team_members_team ON contractor_team_members(team_id);

-- Jobs can be assigned to a team in addition to a solo contractor
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_team_id UUID REFERENCES contractor_teams(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dispute_id UUID;

-- ============================================================
-- SECTION 3: SUPPLY INVENTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS supply_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  unit TEXT NOT NULL,
  units_per_kit_standard NUMERIC(6,2) DEFAULT 0,
  units_per_kit_deep NUMERIC(6,2) DEFAULT 0,
  units_per_kit_moveout NUMERIC(6,2) DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 20,
  cost_per_unit NUMERIC(6,2),
  supplier_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES supply_items(id),
  zone_id UUID REFERENCES zones(id),
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  last_restocked_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, zone_id)
);

CREATE TABLE IF NOT EXISTS supply_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  item_id UUID NOT NULL REFERENCES supply_items(id),
  quantity_assigned NUMERIC(6,2) NOT NULL,
  quantity_returned NUMERIC(6,2),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS supply_restock_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES supply_items(id),
  zone_id UUID REFERENCES zones(id),
  quantity_ordered INTEGER NOT NULL,
  cost_total NUMERIC(8,2),
  status TEXT DEFAULT 'pending',
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supply_inventory_item ON supply_inventory(item_id);
CREATE INDEX idx_supply_assignments_job ON supply_assignments(job_id);
CREATE INDEX idx_supply_assignments_contractor ON supply_assignments(contractor_id);

-- ============================================================
-- SECTION 4: DISPUTES
-- ============================================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  contractor_id UUID REFERENCES contractors(id),
  reported_by TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'open',
  resolution_notes TEXT,
  refund_amount NUMERIC(8,2),
  contractor_penalty NUMERIC(8,2),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_job ON disputes(job_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_dispute_messages_dispute ON dispute_messages(dispute_id);

-- ============================================================
-- SECTION 5: PARTNERS (Realtors & Property Managers)
-- ============================================================

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  company_name TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  zone_id UUID REFERENCES zones(id),
  referral_code TEXT UNIQUE,
  commission_rate NUMERIC(4,3) DEFAULT 0.05,
  credit_balance NUMERIC(8,2) DEFAULT 0,
  billing_email TEXT,
  stripe_customer_id TEXT,
  invoice_billing BOOLEAN DEFAULT FALSE,  -- admin-controlled: no deposit, monthly invoice
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  partner_reference TEXT,
  billing_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  invoice_number TEXT UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  line_items JSONB NOT NULL,
  subtotal NUMERIC(8,2) NOT NULL,
  credits_applied NUMERIC(8,2) DEFAULT 0,
  total_due NUMERIC(8,2) NOT NULL,
  stripe_invoice_id TEXT,
  status TEXT DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partners_zone ON partners(zone_id);
CREATE INDEX idx_partner_bookings_partner ON partner_bookings(partner_id);
CREATE INDEX idx_partner_invoices_partner ON partner_invoices(partner_id);
CREATE INDEX idx_partner_invoices_status ON partner_invoices(status);

-- ============================================================
-- SECTION 6: CUSTOMER REFERRALS
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_customer_id UUID NOT NULL REFERENCES customers(id),
  referred_customer_id UUID REFERENCES customers(id),
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  referrer_credit NUMERIC(8,2) DEFAULT 30.00,
  referred_discount NUMERIC(8,2) DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  credit_applied_at TIMESTAMPTZ
);

-- Extend customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(8,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_score NUMERIC(3,2) DEFAULT 5.00;

CREATE INDEX idx_customer_referrals_referrer ON customer_referrals(referrer_customer_id);
CREATE INDEX idx_customer_referrals_code ON customer_referrals(referral_code);

-- ============================================================
-- SECTION 7: BOOKING SESSIONS (Abandoned Booking Tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  form_data JSONB,
  last_step_completed INTEGER DEFAULT 1,
  quote JSONB,
  recovery_email_1_sent_at TIMESTAMPTZ,
  recovery_email_2_sent_at TIMESTAMPTZ,
  recovery_email_3_sent_at TIMESTAMPTZ,
  discount_code TEXT,
  recovered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_sessions_email ON booking_sessions(email);
CREATE INDEX idx_booking_sessions_recovered ON booking_sessions(recovered);

-- ============================================================
-- SECTION 8: DYNAMIC PRICING CONFIG
-- ============================================================

CREATE TABLE IF NOT EXISTS dynamic_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id),  -- NULL = global config
  is_global_config BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE,
  multiplier_floor NUMERIC(4,3) DEFAULT 1.000,
  multiplier_ceiling NUMERIC(4,3) DEFAULT 1.350,
  tier1_threshold NUMERIC(4,3) DEFAULT 0.70,
  tier1_multiplier NUMERIC(4,3) DEFAULT 1.150,
  tier2_threshold NUMERIC(4,3) DEFAULT 0.90,
  tier2_multiplier NUMERIC(4,3) DEFAULT 1.250,
  same_day_multiplier NUMERIC(4,3) DEFAULT 1.200,
  weekend_multiplier NUMERIC(4,3) DEFAULT 1.100,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_id)
);

-- Insert global config row
INSERT INTO dynamic_pricing_config (is_global_config, zone_id, enabled)
VALUES (TRUE, NULL, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 9: EXTEND EXISTING TABLES
-- ============================================================

-- Contractors: Expo push token for native app
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Two-sided ratings on reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS contractor_customer_rating INTEGER
  CHECK (contractor_customer_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS contractor_customer_notes TEXT;

-- ============================================================
-- SECTION 10: MATERIALIZED VIEW — Zone P&L
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS zone_monthly_pnl AS
SELECT
  j.zone_id,
  DATE_TRUNC('month', j.scheduled_date::TIMESTAMPTZ) AS month,
  COUNT(j.id) AS jobs_completed,
  COALESCE(SUM(j.final_price), 0) AS gross_revenue,
  COALESCE(SUM(j.contractor_payout_amount), 0) AS total_contractor_payouts,
  COALESCE(SUM(j.final_price), 0) - COALESCE(SUM(j.contractor_payout_amount), 0) AS gross_profit,
  COALESCE(AVG(j.final_price), 0) AS avg_ticket,
  COUNT(j.id) FILTER (WHERE j.recurring_booking_id IS NOT NULL) AS recurring_jobs,
  COUNT(j.id) FILTER (WHERE j.recurring_booking_id IS NULL) AS one_time_jobs
FROM jobs j
WHERE j.status IN ('completed', 'reviewed', 'paid_out')
GROUP BY j.zone_id, DATE_TRUNC('month', j.scheduled_date::TIMESTAMPTZ);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_monthly_pnl_zone_month
  ON zone_monthly_pnl (zone_id, month);

-- ============================================================
-- SECTION 11: ROW LEVEL SECURITY
-- ============================================================

-- zone_staff
ALTER TABLE zone_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zone_staff_admin" ON zone_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "zone_staff_own_read" ON zone_staff FOR SELECT USING (
  profile_id = auth.uid()
);

-- Helper function: get zone IDs for the current zone_manager
CREATE OR REPLACE FUNCTION get_managed_zone_ids()
RETURNS SETOF UUID AS $$
  SELECT zone_id FROM zone_staff WHERE profile_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Zone-scoped jobs policy for zone managers
CREATE POLICY "jobs_zone_manager" ON jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'zone_manager')
  AND zone_id IN (SELECT get_managed_zone_ids())
);

CREATE POLICY "jobs_zone_manager_update" ON jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'zone_manager')
  AND zone_id IN (SELECT get_managed_zone_ids())
);

-- contractor_teams
ALTER TABLE contractor_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_teams_admin" ON contractor_teams FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "contractor_teams_zone_manager" ON contractor_teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'zone_manager')
  AND zone_id IN (SELECT get_managed_zone_ids())
);

-- contractor_team_members
ALTER TABLE contractor_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_team_members_admin" ON contractor_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- supply_items
ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_items_admin" ON supply_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'zone_manager'))
);

CREATE POLICY "supply_items_read" ON supply_items FOR SELECT USING (is_active = TRUE);

-- supply_inventory
ALTER TABLE supply_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_inventory_admin" ON supply_inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "supply_inventory_zone_manager" ON supply_inventory FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'zone_manager')
  AND zone_id IN (SELECT get_managed_zone_ids())
);

-- supply_assignments
ALTER TABLE supply_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_assignments_admin" ON supply_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "supply_assignments_contractor" ON supply_assignments FOR SELECT USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

-- supply_restock_orders
ALTER TABLE supply_restock_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_restock_admin" ON supply_restock_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'zone_manager'))
);

-- disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_admin" ON disputes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "disputes_zone_manager" ON disputes FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'zone_manager')
  AND job_id IN (SELECT id FROM jobs WHERE zone_id IN (SELECT get_managed_zone_ids()))
);

CREATE POLICY "disputes_customer_own" ON disputes FOR SELECT USING (
  customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
);

CREATE POLICY "disputes_customer_insert" ON disputes FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
);

-- dispute_messages: CRITICAL — separate thread visibility
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_messages_admin" ON dispute_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Customer sees only customer and admin messages (never contractor side)
CREATE POLICY "dispute_messages_customer_read" ON dispute_messages FOR SELECT USING (
  sender_role IN ('customer', 'admin')
  AND dispute_id IN (
    SELECT d.id FROM disputes d
    WHERE d.customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  )
);

-- Contractor sees only contractor and admin messages (never customer side)
CREATE POLICY "dispute_messages_contractor_read" ON dispute_messages FOR SELECT USING (
  sender_role IN ('contractor', 'admin')
  AND dispute_id IN (
    SELECT d.id FROM disputes d
    WHERE d.contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  )
);

CREATE POLICY "dispute_messages_insert" ON dispute_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

-- partners
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_admin" ON partners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "partners_own" ON partners FOR SELECT USING (
  profile_id = auth.uid()
);

CREATE POLICY "partners_own_update" ON partners FOR UPDATE USING (
  profile_id = auth.uid()
);

-- partner_bookings
ALTER TABLE partner_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_bookings_admin" ON partner_bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "partner_bookings_own" ON partner_bookings FOR ALL USING (
  partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
);

-- partner_invoices
ALTER TABLE partner_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_invoices_admin" ON partner_invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "partner_invoices_own" ON partner_invoices FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
);

-- customer_referrals
ALTER TABLE customer_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_admin" ON customer_referrals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "referrals_own" ON customer_referrals FOR SELECT USING (
  referrer_customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  OR referred_customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
);

-- booking_sessions
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_sessions_admin" ON booking_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "booking_sessions_service_only" ON booking_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "booking_sessions_update" ON booking_sessions FOR UPDATE USING (true);

-- dynamic_pricing_config
ALTER TABLE dynamic_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_config_admin" ON dynamic_pricing_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "pricing_config_read" ON dynamic_pricing_config FOR SELECT USING (true);

-- ============================================================
-- SECTION 12: REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE dispute_messages;
