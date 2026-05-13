-- Sea of Blue — Map Integration Tables
-- Adds location tracking, zone boundaries, and geocoding columns

-- ============================================================
-- CONTRACTOR LIVE LOCATION
-- Updated in real-time during active jobs
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE UNIQUE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  accuracy NUMERIC(6,2),
  heading NUMERIC(5,2),             -- degrees 0-360 for directional marker
  speed NUMERIC(5,2),               -- km/h
  is_active BOOLEAN DEFAULT TRUE,   -- false when contractor goes offline
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contractor_locations_contractor ON contractor_locations(contractor_id);
CREATE INDEX idx_contractor_locations_active ON contractor_locations(is_active) WHERE is_active = TRUE;

-- ============================================================
-- JOB LOCATION HISTORY
-- Breadcrumb trail per job, used for audit and ETA
-- ============================================================

CREATE TABLE IF NOT EXISTS job_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_location_history_job ON job_location_history(job_id);
CREATE INDEX idx_job_location_history_contractor ON job_location_history(contractor_id);

-- ============================================================
-- ZONE BOUNDARIES
-- GeoJSON polygon per zone for map display
-- ============================================================

CREATE TABLE IF NOT EXISTS zone_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE UNIQUE,
  geojson JSONB NOT NULL,           -- GeoJSON Polygon feature
  center_lat NUMERIC(10,7),
  center_lng NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zone_boundaries_zone ON zone_boundaries(zone_id);

-- ============================================================
-- GEOCODED COORDINATES ON EXISTING TABLES
-- ============================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- contractor_locations
ALTER TABLE contractor_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_locations_admin" ON contractor_locations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "contractor_locations_own" ON contractor_locations FOR ALL USING (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

-- Allow public read for customer tracking (contractor location visible to anyone with job link)
CREATE POLICY "contractor_locations_public_read" ON contractor_locations FOR SELECT USING (
  is_active = TRUE
);

-- job_location_history
ALTER TABLE job_location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_location_history_admin" ON job_location_history FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "job_location_history_contractor_insert" ON job_location_history FOR INSERT WITH CHECK (
  contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
);

-- zone_boundaries
ALTER TABLE zone_boundaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zone_boundaries_read" ON zone_boundaries FOR SELECT USING (true);

CREATE POLICY "zone_boundaries_admin" ON zone_boundaries FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- ENABLE REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE contractor_locations;
