import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor ID
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Get pending offers
    const { data: offers, error } = await supabase
      .from('job_offers')
      .select('*, job:jobs(*)')
      .eq('contractor_id', contractor.id)
      .eq('status', 'pending')
      .order('offered_at', { ascending: false });

    if (error) throw error;

    // Filter out offers where the job is already assigned or taken
    // (Though respond/route.ts should handle this by marking them declined, 
    // it's good to be safe)
    const validOffers = (offers || []).filter(o => o.job && o.job.status === 'offered');

    return NextResponse.json(validOffers);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
