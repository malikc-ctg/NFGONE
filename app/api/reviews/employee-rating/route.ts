import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

// POST /api/reviews/employee-rating
// Employee rates a customer after completing their job
export async function POST(request: NextRequest) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();
    const { job_id, employee_customer_rating, employee_customer_notes } = body;

    if (!job_id || !employee_customer_rating) {
      return NextResponse.json({ error: 'job_id and rating required' }, { status: 400 });
    }

    if (employee_customer_rating < 1 || employee_customer_rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Update or upsert review record
    const { data: review, error } = await supabase
      .from('reviews')
      .update({
        employee_customer_rating,
        employee_customer_notes: employee_customer_notes ?? null,
      })
      .eq('job_id', job_id)
      .select('customer_id')
      .single();

    if (error) throw error;

    // Recalculate customer score (rolling average of employee ratings)
    const { data: allRatings } = await supabase
      .from('reviews')
      .select('employee_customer_rating')
      .eq('customer_id', review.customer_id)
      .not('employee_customer_rating', 'is', null);

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((sum, r) => sum + (r.employee_customer_rating as number), 0) / allRatings.length;
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
          message: `Customer ${review.customer_id} has a score of ${newScore} from ${allRatings.length} employee ratings.`,
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
