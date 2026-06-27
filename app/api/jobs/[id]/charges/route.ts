import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, description } = await request.json();
    if (!amount || !description) {
      return NextResponse.json({ error: 'Missing amount or description' }, { status: 400 });
    }

    // Get current job to increment price and append to addons
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('quoted_price, add_ons')
      .eq('id', params.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const newAddOns = [...(job.add_ons || []), `Extra: ${description} ($${amount})`];
    const newPrice = job.quoted_price + parseFloat(amount);

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        quoted_price: newPrice,
        add_ons: newAddOns,
      })
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Refresh finance PnL because job price increased
    try {
      await supabase.rpc('refresh_zone_monthly_pnl');
    } catch (pnlError) {
      console.error('Failed to refresh PnL view:', pnlError);
    }

    return NextResponse.json({ success: true, newPrice, newAddOns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
