-- ============================================================
-- Sea of Blue — Enterprise Migration
-- Smart Dispatch + Audit Logging + PWA Support
-- ============================================================

-- ─── 1. AUDIT LOGS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- RLS: Only admins can read audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Service role can insert (backend writes)
DROP POLICY IF EXISTS "audit_logs_service_insert" ON audit_logs;
CREATE POLICY "audit_logs_service_insert" ON audit_logs FOR INSERT WITH CHECK (true);

GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO service_role;
GRANT SELECT ON audit_logs TO service_role;

-- ─── 2. SMART DISPATCH COLUMNS ON JOB_OFFERS ─────────────────
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS estimated_drive_minutes INTEGER;
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS dispatch_reason TEXT;

-- ─── 3. OFFLINE SYNC SUPPORT ─────────────────────────────────
-- Track last-synced timestamp for offline contractors
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
