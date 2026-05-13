-- Sea of Blue — Phase 3 Enum Extensions
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PG < 12.
-- Supabase uses PG 15+ so it CAN run inside a transaction, but the new values
-- will NOT be visible within the SAME transaction. We isolate enum changes to this
-- dedicated migration file so they are committed before 004 runs.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'zone_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';
