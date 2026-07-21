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

    // Get employee
    const { data: employee, error: cErr } = await serviceClient
      .from('employees')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (cErr || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get score history (last 10 entries)
    const { data: history } = await serviceClient
      .from('employee_score_history')
      .select('*')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent reviews
    const { data: reviews } = await serviceClient
      .from('reviews')
      .select('id, rating, was_on_time, job_completed_properly, public_comment, created_at, job:jobs(job_number, service_type, scheduled_date)')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      score_history: history || [],
      reviews: reviews || [],
    });
  } catch (err: unknown) {
    console.error('Score history API error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
