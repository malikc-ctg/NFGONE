import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const zone_id = searchParams.get('zone_id');
    const months = parseInt(searchParams.get('months') ?? '6');

    let query = supabase
      .from('zone_monthly_pnl')
      .select('*, zone:zones(name, city)')
      .order('month', { ascending: false })
      .limit(months * 10); // 10 zones max × months

    if (zone_id) query = query.eq('zone_id', zone_id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
