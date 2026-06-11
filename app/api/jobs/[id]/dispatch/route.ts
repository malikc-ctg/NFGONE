import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { id } = params;
    const { contractor_ids } = await request.json();

    if (!contractor_ids || !Array.isArray(contractor_ids) || contractor_ids.length === 0) {
      return NextResponse.json({ error: 'contractor_ids required' }, { status: 400 });
    }

    if (contractor_ids.length > 5) {
      return NextResponse.json({ error: 'Max 5 contractors per dispatch' }, { status: 400 });
    }

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Create offers
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    const offers = contractor_ids.map((cid: string) => ({
      job_id: id,
      contractor_id: cid,
      status: 'pending',
      expires_at: expiresAt,
    }));

    const { data: createdOffers, error: offerError } = await supabase
      .from('job_offers')
      .insert(offers)
      .select();

    if (offerError) throw offerError;

    // Update job status to offered
    await supabase
      .from('jobs')
      .update({ status: 'offered', updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ offers: createdOffers });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
