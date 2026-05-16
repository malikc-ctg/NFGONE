import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const zone_id = searchParams.get('zone_id');

    // Get last 3 months of P&L data for the zone
    const { data: pnlData } = await supabase
      .from('zone_monthly_pnl')
      .select('*, zone:zones(name)')
      .eq('zone_id', zone_id ?? '')
      .order('month', { ascending: false })
      .limit(6);

    if (!pnlData || pnlData.length < 2) {
      return NextResponse.json({
        forecast: [],
        break_even_jobs: null,
        expansion_score: null,
        message: 'Insufficient data for forecast',
      });
    }

    // Simple 3-month linear trend projection
    const recentMonths = pnlData.slice(0, 3);
    const avgRevenue = recentMonths.reduce((s, m) => s + (m.gross_revenue as number), 0) / recentMonths.length;
    const avgProfit = recentMonths.reduce((s, m) => s + (m.gross_profit as number), 0) / recentMonths.length;
    const avgJobs = recentMonths.reduce((s, m) => s + (m.jobs_completed as number), 0) / recentMonths.length;
    const avgTicket = avgJobs > 0 ? avgRevenue / avgJobs : 0;

    // Month-over-month growth rate
    const growth = pnlData.length >= 2
      ? ((pnlData[0].gross_revenue as number) - (pnlData[1].gross_revenue as number)) / Math.max(pnlData[1].gross_revenue as number, 1)
      : 0.05;

    const forecast = [1, 2, 3].map((n) => ({
      month: new Date(Date.now() + n * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
      projected_revenue: Math.round(avgRevenue * Math.pow(1 + growth, n)),
      projected_jobs: Math.round(avgJobs * Math.pow(1 + growth, n)),
      projected_profit: Math.round(avgProfit * Math.pow(1 + growth, n)),
    }));

    // Break-even: assume $2,000/month zone operational costs
    const ZONE_MONTHLY_COST = 2000;
    const breakEvenJobs = avgTicket > 0
      ? Math.ceil(ZONE_MONTHLY_COST / (avgTicket * 0.3)) // 30% average margin
      : null;

    // Expansion readiness score (0-100)
    const { count: contractorCount } = await supabase
      .from('contractors')
      .select('id', { count: 'exact', head: true })
      .eq('zone_id', zone_id ?? '')
      .eq('status', 'active');

    const recurringRate = pnlData[0]
      ? (pnlData[0].recurring_jobs as number) / Math.max(pnlData[0].jobs_completed as number, 1)
      : 0;

    const margin = avgRevenue > 0 ? avgProfit / avgRevenue : 0;

    let score = 0;
    if (avgJobs >= 100) score += 25;
    else if (avgJobs >= 50) score += 15;
    else if (avgJobs >= 20) score += 5;
    if ((contractorCount ?? 0) >= 5) score += 20;
    else if ((contractorCount ?? 0) >= 3) score += 10;
    if (recurringRate >= 0.4) score += 25;
    else if (recurringRate >= 0.2) score += 15;
    if (avgTicket >= 200) score += 15;
    else if (avgTicket >= 150) score += 8;
    if (margin >= 0.35) score += 15;
    else if (margin >= 0.25) score += 8;

    return NextResponse.json({
      forecast,
      break_even_jobs: breakEvenJobs,
      expansion_score: {
        score,
        ready: score >= 70,
        jobs_per_month: Math.round(avgJobs),
        contractor_count: contractorCount ?? 0,
        recurring_rate: Math.round(recurringRate * 100),
        avg_ticket: Math.round(avgTicket),
        net_margin: Math.round(margin * 100),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
