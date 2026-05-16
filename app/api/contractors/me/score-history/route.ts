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

    // Get contractor
    const { data: contractor, error: cErr } = await serviceClient
      .from('contractors')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (cErr || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Get score history (last 10 entries)
    const { data: history } = await serviceClient
      .from('contractor_score_history')
      .select('*')
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent reviews
    const { data: reviews } = await serviceClient
      .from('reviews')
      .select('id, rating, was_on_time, job_completed_properly, public_comment, created_at, job:jobs(job_number, service_type, scheduled_date)')
      .eq('contractor_id', contractor.id)
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
