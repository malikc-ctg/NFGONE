import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

// POST /api/reviews/contractor-rating
// Contractor rates a customer after completing their job
export async function POST(request: NextRequest) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();
    const { job_id, contractor_customer_rating, contractor_customer_notes } = body;

    if (!job_id || !contractor_customer_rating) {
      return NextResponse.json({ error: 'job_id and rating required' }, { status: 400 });
    }

    if (contractor_customer_rating < 1 || contractor_customer_rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Update or upsert review record
    const { data: review, error } = await supabase
      .from('reviews')
      .update({
        contractor_customer_rating,
        contractor_customer_notes: contractor_customer_notes ?? null,
      })
      .eq('job_id', job_id)
      .select('customer_id')
      .single();

    if (error) throw error;

    // Recalculate customer score (rolling average of contractor ratings)
    const { data: allRatings } = await supabase
      .from('reviews')
      .select('contractor_customer_rating')
      .eq('customer_id', review.customer_id)
      .not('contractor_customer_rating', 'is', null);

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((sum, r) => sum + (r.contractor_customer_rating as number), 0) / allRatings.length;
      const newScore = Math.round(avg * 100) / 100;

      await supabase
        .from('customers')
        .update({ customer_score: newScore })
        .eq('id', review.customer_id);

      // Flag customer if score drops below 3.5 after 3+ ratings
      if (newScore < 3.5 && allRatings.length >= 3) {
        await supabase.from('notifications').insert({
          notification_type: 'low_customer_score',
          channel: 'internal',
          message: `Customer ${review.customer_id} has a score of ${newScore} from ${allRatings.length} contractor ratings.`,
          sent_at: new Date().toISOString(),
          delivered: true,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
