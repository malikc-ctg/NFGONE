-- Fix zone_monthly_pnl view to fallback to quoted_price when final_price is null
DROP MATERIALIZED VIEW IF EXISTS zone_monthly_pnl;

CREATE MATERIALIZED VIEW zone_monthly_pnl AS
SELECT
  j.zone_id,
  DATE_TRUNC('month', j.scheduled_date::TIMESTAMPTZ) AS month,
  COUNT(j.id) AS jobs_completed,
  COALESCE(SUM(COALESCE(j.final_price, j.quoted_price)), 0) AS gross_revenue,
  COALESCE(SUM(COALESCE(j.contractor_payout_amount, 0)), 0) AS total_contractor_payouts,
  COALESCE(SUM(COALESCE(j.final_price, j.quoted_price)), 0) - COALESCE(SUM(COALESCE(j.contractor_payout_amount, 0)), 0) AS gross_profit,
  COALESCE(AVG(COALESCE(j.final_price, j.quoted_price)), 0) AS avg_ticket,
  COUNT(j.id) FILTER (WHERE j.recurring_booking_id IS NOT NULL) AS recurring_jobs,
  COUNT(j.id) FILTER (WHERE j.recurring_booking_id IS NULL) AS one_time_jobs
FROM jobs j
WHERE j.status IN ('completed', 'reviewed', 'paid_out')
GROUP BY j.zone_id, DATE_TRUNC('month', j.scheduled_date::TIMESTAMPTZ);

CREATE UNIQUE INDEX idx_zone_monthly_pnl_zone_month
  ON zone_monthly_pnl (zone_id, month);

GRANT SELECT ON zone_monthly_pnl TO service_role;
GRANT SELECT ON zone_monthly_pnl TO authenticated;
