import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = await createServiceClient();

    // Get employee record
    const { data: employee, error: cErr } = await serviceClient
      .from('employees')
      .select('id, score, payout_rate, tier')
      .eq('profile_id', user.id)
      .single();

    if (cErr || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get this week's date range (Mon-Sun)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // This month's date range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get completed jobs this week
    const { data: weekJobs } = await serviceClient
      .from('jobs')
      .select('quoted_price, employee_payout_amount')
      .eq('assigned_employee_id', employee.id)
      .in('status', ['completed', 'reviewed', 'paid_out'])
      .gte('scheduled_date', weekStart.toISOString().split('T')[0])
      .lte('scheduled_date', weekEnd.toISOString().split('T')[0]);

    // Get completed jobs this month
    const { data: monthJobs } = await serviceClient
      .from('jobs')
      .select('quoted_price, employee_payout_amount')
      .eq('assigned_employee_id', employee.id)
      .in('status', ['completed', 'reviewed', 'paid_out'])
      .gte('scheduled_date', monthStart.toISOString().split('T')[0])
      .lte('scheduled_date', monthEnd.toISOString().split('T')[0]);

    // Get all-time completed count
    const { count: totalCompleted } = await serviceClient
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_employee_id', employee.id)
      .in('status', ['completed', 'reviewed', 'paid_out']);

    // Get pending payouts
    const { data: pendingPayouts } = await serviceClient
      .from('employee_payouts')
      .select('amount')
      .eq('employee_id', employee.id)
      .in('status', ['pending', 'processing']);

    // Get average review rating
    const { data: reviews } = await serviceClient
      .from('reviews')
      .select('rating')
      .eq('employee_id', employee.id);

    const payoutRate = employee.payout_rate || 0.7;

    const weekEarnings = (weekJobs || []).reduce((sum, j) => {
      return sum + (j.employee_payout_amount || j.quoted_price * payoutRate);
    }, 0);

    const monthEarnings = (monthJobs || []).reduce((sum, j) => {
      return sum + (j.employee_payout_amount || j.quoted_price * payoutRate);
    }, 0);

    const pendingAmount = (pendingPayouts || []).reduce((sum, p) => sum + p.amount, 0);

    const avgRating = reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : employee.score?.toString() || '5.0';

    return NextResponse.json({
      score: parseFloat(avgRating),
      tier: employee.tier,
      payout_rate: payoutRate,
      week_earnings: Math.round(weekEarnings),
      month_earnings: Math.round(monthEarnings),
      week_jobs: (weekJobs || []).length,
      month_jobs: (monthJobs || []).length,
      total_completed: totalCompleted || 0,
      pending_payout: Math.round(pendingAmount),
      total_reviews: (reviews || []).length,
    });
  } catch (err: unknown) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
