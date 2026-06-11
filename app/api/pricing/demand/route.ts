import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Admin-only — exposes internal capacity data
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const zone_id = searchParams.get('zone_id');
    const date = searchParams.get('date');
    const window = searchParams.get('window');

    if (!zone_id || !date) {
      return NextResponse.json({ error: 'zone_id and date required' }, { status: 400 });
    }

    // Jobs booked per window for this zone/date
    const windows = window ? [window] : ['morning', 'afternoon', 'evening'];
    const demand: Record<string, { booked: number; capacity: number; utilization: number }> = {};

    for (const w of windows) {
      const { count: booked } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('zone_id', zone_id)
        .eq('scheduled_date', date)
        .eq('scheduled_window', w)
        .not('status', 'in', '(cancelled,refunded)');

      // Simple capacity estimate: 2 jobs per active contractor per window
      const { count: contractors } = await supabase
        .from('contractors')
        .select('id', { count: 'exact', head: true })
        .eq('zone_id', zone_id)
        .eq('status', 'active');

      const capacity = (contractors ?? 2) * 2;
      demand[w] = {
        booked: booked ?? 0,
        capacity,
        utilization: capacity > 0 ? Math.min((booked ?? 0) / capacity, 1) : 0,
      };
    }

    return NextResponse.json({ zone_id, date, demand });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
