import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = await createServiceClient();

    // Get employee
    const { data: employee, error: cErr } = await serviceClient
      .from('employees')
      .select('id, payout_rate')
      .eq('profile_id', user.id)
      .single();

    if (cErr || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Calculate date range
    const now = new Date();
    let startDate: string;

    if (period === 'week') {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      startDate = weekStart.toISOString().split('T')[0];
    } else if (period === 'all') {
      startDate = '2020-01-01';
    } else {
      // Default: month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    // Get completed jobs with payout info
    const { data: jobs } = await serviceClient
      .from('jobs')
      .select('id, job_number, service_type, scheduled_date, scheduled_window, quoted_price, employee_payout_amount, status, city, address_line1')
      .eq('assigned_employee_id', employee.id)
      .in('status', ['completed', 'reviewed', 'paid_out'])
      .gte('scheduled_date', startDate)
      .order('scheduled_date', { ascending: false });

    // Get payouts
    const { data: payouts } = await serviceClient
      .from('employee_payouts')
      .select('id, job_id, amount, payout_rate, status, payout_method, paid_at, created_at')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate weekly breakdown (last 8 weeks)
    const weeklyBreakdown: { week: string; earnings: number; jobs: number }[] = [];
    const payoutRate = employee.payout_rate || 0.7;

    for (let i = 0; i < 8; i++) {
      const wStart = new Date(now);
      wStart.setDate(now.getDate() - (now.getDay() || 7) + 1 - (i * 7));
      wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);

      const wStartStr = wStart.toISOString().split('T')[0];
      const wEndStr = wEnd.toISOString().split('T')[0];

      const weekJobs = (jobs || []).filter(j => j.scheduled_date >= wStartStr && j.scheduled_date <= wEndStr);
      const weekEarnings = weekJobs.reduce((sum, j) => {
        return sum + (j.employee_payout_amount || j.quoted_price * payoutRate);
      }, 0);

      weeklyBreakdown.push({
        week: `${wStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`,
        earnings: Math.round(weekEarnings),
        jobs: weekJobs.length,
      });
    }

    // Total earned
    const totalEarned = (jobs || []).reduce((sum, j) => {
      return sum + (j.employee_payout_amount || j.quoted_price * payoutRate);
    }, 0);

    // Pending amount
    const pendingAmount = (payouts || [])
      .filter(p => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.amount, 0);

    // Paid out amount
    const paidAmount = (payouts || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      summary: {
        total_earned: Math.round(totalEarned),
        pending_payout: Math.round(pendingAmount),
        total_paid: Math.round(paidAmount),
        total_jobs: (jobs || []).length,
      },
      jobs: (jobs || []).map(j => ({
        ...j,
        payout: Math.round(j.employee_payout_amount || j.quoted_price * payoutRate),
      })),
      payouts: payouts || [],
      weekly_breakdown: weeklyBreakdown.reverse(),
    });
  } catch (err: unknown) {
    console.error('Earnings API error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
