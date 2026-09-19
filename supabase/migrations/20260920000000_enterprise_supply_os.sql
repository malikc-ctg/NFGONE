-- ============================================================
-- Migration: Enterprise Supply OS & Asset Intelligence
-- Supports: Auto-Categorization, Multi-Vendor Ingestion (Home Depot Pro Xtra + Amazon),
-- QuickBooks Purchase Reconciler, Equipment Fleet Custody, and Predictive Restock
-- ============================================================

-- 1. Extend supply_items with categories, vendor identifiers, dilution, and QBO mapping
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'consumable';
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS home_depot_sku TEXT;
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS amazon_asin TEXT;
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS preferred_store TEXT DEFAULT 'Home Depot';
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS dilution_ratio TEXT;
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS avg_usage_per_job NUMERIC(6,2) DEFAULT 0.50;
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS sds_url TEXT;
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS qbo_account_name TEXT DEFAULT 'COGS: Cleaning Supplies';

-- 2. Purchases table (Home Depot Pro Xtra exports, Amazon CSV orders, QBO synced expenses)
CREATE TABLE IF NOT EXISTS supply_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'home_depot_pro_xtra', 'amazon_orders', 'quickbooks_sync', 'manual'
  vendor_name TEXT NOT NULL, -- 'The Home Depot', 'Amazon.com', etc.
  order_reference TEXT, -- Receipt #, Pro Xtra Order #, Amazon Order ID
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_review', -- 'pending_review', 'reconciled', 'partial'
  raw_data JSONB,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Line items within each purchase
CREATE TABLE IF NOT EXISTS supply_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES supply_purchases(id) ON DELETE CASCADE,
  raw_identifier TEXT, -- SKU, ASIN, or Model number from receipt
  raw_description TEXT NOT NULL,
  category TEXT DEFAULT 'consumable',
  quantity NUMERIC(8,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  matched_item_id UUID REFERENCES supply_items(id) ON DELETE SET NULL,
  is_reconciled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Self-Learning Vendor SKU & ASIN Mapping Dictionary
CREATE TABLE IF NOT EXISTS supply_vendor_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL, -- 'The Home Depot', 'Amazon'
  vendor_code TEXT NOT NULL, -- Store SKU, Internet #, ASIN, or standardized title keyword
  supply_item_id UUID NOT NULL REFERENCES supply_items(id) ON DELETE CASCADE,
  auto_learned BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_name, vendor_code)
);

-- 5. Durable Equipment Fleet & Machinery
CREATE TABLE IF NOT EXISTS equipment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES supply_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  model_number TEXT,
  serial_number TEXT UNIQUE,
  asset_tag TEXT UNIQUE NOT NULL, -- Barcode / QR tag (e.g. 'EQ-VAC-001')
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  current_holder_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'checked_out', 'in_maintenance', 'damaged', 'retired'
  condition TEXT NOT NULL DEFAULT 'good', -- 'pristine', 'good', 'worn', 'maintenance_needed', 'damaged'
  total_runtime_hours NUMERIC(6,1) DEFAULT 0,
  last_inspected_at TIMESTAMPTZ,
  next_maintenance_due TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Equipment Custody Logs (Dispatch & Return History)
CREATE TABLE IF NOT EXISTS equipment_custody_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'checkout', 'checkin', 'maintenance_transfer'
  condition_reported TEXT DEFAULT 'good',
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast operations
CREATE INDEX IF NOT EXISTS idx_supply_items_category ON supply_items(category);
CREATE INDEX IF NOT EXISTS idx_supply_items_hd_sku ON supply_items(home_depot_sku);
CREATE INDEX IF NOT EXISTS idx_supply_items_asin ON supply_items(amazon_asin);
CREATE INDEX IF NOT EXISTS idx_supply_purchases_status ON supply_purchases(status);
CREATE INDEX IF NOT EXISTS idx_supply_purchases_vendor ON supply_purchases(vendor_name);
CREATE INDEX IF NOT EXISTS idx_supply_purchase_items_purchase ON supply_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_supply_vendor_mappings_lookup ON supply_vendor_mappings(vendor_name, vendor_code);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_status ON equipment_assets(status);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_tag ON equipment_assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_equipment_custody_asset ON equipment_custody_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_equipment_custody_contractor ON equipment_custody_logs(contractor_id);

-- RLS Security Policies
ALTER TABLE supply_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_vendor_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_custody_logs ENABLE ROW LEVEL SECURITY;

-- Allow full access to service role
CREATE POLICY "Service role full access on supply_purchases" ON supply_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on supply_purchase_items" ON supply_purchase_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on supply_vendor_mappings" ON supply_vendor_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on equipment_assets" ON equipment_assets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on equipment_custody_logs" ON equipment_custody_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated admins to view/manage
CREATE POLICY "Admins full access on supply_purchases" ON supply_purchases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins full access on supply_purchase_items" ON supply_purchase_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins full access on supply_vendor_mappings" ON supply_vendor_mappings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins full access on equipment_assets" ON equipment_assets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins full access on equipment_custody_logs" ON equipment_custody_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
