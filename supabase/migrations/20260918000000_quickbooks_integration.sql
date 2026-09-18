-- Migration: QuickBooks Online Integration
-- Tables for storing OAuth connections, tokens, sync history, and foreign entity mappings

CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id TEXT UNIQUE NOT NULL,
  company_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quickbooks_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'partner_invoice', 'job', 'customer', 'connection_test'
  entity_id TEXT,
  qbo_id TEXT,
  status TEXT NOT NULL, -- 'success', 'failed', 'pending'
  error_message TEXT,
  intuit_tid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qbo_connections_active ON quickbooks_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_logs_entity ON quickbooks_sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_logs_status ON quickbooks_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_logs_created_at ON quickbooks_sync_logs(created_at DESC);

-- Columns on existing entities for tracking QuickBooks mapping
ALTER TABLE partner_invoices ADD COLUMN IF NOT EXISTS qbo_invoice_id TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_invoice_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT;

-- RLS policies
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on quickbooks_connections" ON quickbooks_connections;
CREATE POLICY "Service role full access on quickbooks_connections" ON quickbooks_connections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on quickbooks_sync_logs" ON quickbooks_sync_logs;
CREATE POLICY "Service role full access on quickbooks_sync_logs" ON quickbooks_sync_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated admins to view sync logs and connection status
DROP POLICY IF EXISTS "Admins can view quickbooks_connections" ON quickbooks_connections;
CREATE POLICY "Admins can view quickbooks_connections" ON quickbooks_connections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can view quickbooks_sync_logs" ON quickbooks_sync_logs;
CREATE POLICY "Admins can view quickbooks_sync_logs" ON quickbooks_sync_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
