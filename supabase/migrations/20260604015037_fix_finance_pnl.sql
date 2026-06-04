-- Fix Finance P&L: Create refresh function, grant API access, do initial refresh
-- This migration fixes the finance page which couldn't load because:
-- 1. The refresh_zone_monthly_pnl RPC function was never created
-- 2. The zone_monthly_pnl materialized view was never populated

-- ============================================================
-- 1. Create the RPC function to refresh the materialized view
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_zone_monthly_pnl()
RETURNS void AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY zone_monthly_pnl;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Grant execute to service role (used by the cron endpoint)
GRANT EXECUTE ON FUNCTION public.refresh_zone_monthly_pnl() TO service_role;

-- ============================================================
-- 2. Grant the service role access to query the materialized view
--    (needed since new tables/views aren't auto-exposed in newer Supabase)
-- ============================================================

GRANT SELECT ON zone_monthly_pnl TO service_role;
GRANT SELECT ON zone_monthly_pnl TO authenticated;

-- ============================================================
-- 3. Do the initial refresh so there's data immediately
--    (uses non-concurrent refresh since it might be empty)
-- ============================================================

REFRESH MATERIALIZED VIEW zone_monthly_pnl;
