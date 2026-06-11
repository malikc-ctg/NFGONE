import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { recalculateContractorScore } from '@/lib/contractor-scoring';
import { requireRole } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();

    const { job_id, customer_id, contractor_id, rating,
            was_on_time, job_completed_properly, anything_missed,
            would_book_again, public_comment, private_feedback } = body;

    if (!job_id || !customer_id || !contractor_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        job_id, customer_id, contractor_id, rating,
        was_on_time, job_completed_properly, anything_missed,
        would_book_again, public_comment, private_feedback,
      })
      .select()
      .single();

    if (error) throw error;

    // Update job status to reviewed
    await supabase
      .from('jobs')
      .update({ status: 'reviewed', updated_at: new Date().toISOString() })
      .eq('id', job_id);

    // Recalculate contractor score
    await recalculateContractorScore(contractor_id);

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
