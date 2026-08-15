import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const zone_id = searchParams.get('zone_id');
    const months = parseInt(searchParams.get('months') ?? '6');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    if (start_date && end_date) {
      // Dynamic PNL
      const query = supabase.rpc('calculate_dynamic_pnl', {
        p_start_date: start_date,
        p_end_date: end_date,
        p_zone_id: zone_id || null
      }).select('*, zone:zones(name, city)');

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      let query = supabase
        .from('zone_monthly_pnl')
        .select('*, zone:zones(name, city)')
        .order('month', { ascending: false })
        .limit(months * 10); // 10 zones max × months

      if (zone_id) query = query.eq('zone_id', zone_id);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
