-- Migration to add dynamic PNL calculation function
CREATE OR REPLACE FUNCTION calculate_dynamic_pnl(p_start_date DATE, p_end_date DATE, p_zone_id UUID DEFAULT NULL)
RETURNS TABLE (
  zone_id UUID,
  month TEXT,
  jobs_completed BIGINT,
  gross_revenue NUMERIC,
  total_employee_payouts NUMERIC,
  gross_profit NUMERIC,
  avg_ticket NUMERIC,
  recurring_jobs BIGINT,
  one_time_jobs BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.zone_id,
    'custom'::TEXT AS month,
    COUNT(j.id) AS jobs_completed,
    COALESCE(SUM(COALESCE(j.final_price, j.quoted_price)), 0) AS gross_revenue,
    COALESCE(SUM(COALESCE(j.employee_payout_amount, 0)), 0) AS total_employee_payouts,
    COALESCE(SUM(COALESCE(j.final_price, j.quoted_price)), 0) - COALESCE(SUM(COALESCE(j.employee_payout_amount, 0)), 0) AS gross_profit,
    COALESCE(AVG(COALESCE(j.final_price, j.quoted_price)), 0) AS avg_ticket,
    COUNT(j.id) FILTER (WHERE j.recurring_booking_id IS NOT NULL) AS recurring_jobs,
    COUNT(j.id) FILTER (WHERE j.recurring_booking_id IS NULL) AS one_time_jobs
  FROM jobs j
  WHERE j.status IN ('completed', 'reviewed', 'paid_out')
    AND j.scheduled_date::DATE >= p_start_date
    AND j.scheduled_date::DATE <= p_end_date
    AND (p_zone_id IS NULL OR j.zone_id = p_zone_id)
  GROUP BY j.zone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_dynamic_pnl(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_dynamic_pnl(DATE, DATE, UUID) TO service_role;
