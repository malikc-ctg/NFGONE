import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);

    const date = searchParams.get('date');
    const window = searchParams.get('window');
    const zone_id = searchParams.get('zone_id');

    if (!date || !window) {
      return NextResponse.json({ error: 'date and window required' }, { status: 400 });
    }

    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Get contractors in the zone who are active
    let query = supabase
      .from('contractors')
      .select('*, zone:zones(*)')
      .eq('status', 'active');

    if (zone_id) query = query.eq('zone_id', zone_id);

    const { data: contractors, error } = await query;
    if (error) throw error;

    // Get availability for each contractor
    const available = [];
    for (const c of contractors ?? []) {
      // Check override first
      const { data: override } = await supabase
        .from('contractor_availability_overrides')
        .select('is_available')
        .eq('contractor_id', c.id)
        .eq('override_date', date)
        .eq('time_window', window)
        .single();

      if (override) {
        if (override.is_available) available.push(c);
        continue;
      }

      // Check regular availability
      const { data: avail } = await supabase
        .from('contractor_availability')
        .select('is_available')
        .eq('contractor_id', c.id)
        .eq('day_of_week', dayOfWeek)
        .eq('time_window', window)
        .single();

      if (avail?.is_available !== false) {
        // Check if already assigned a job in this window
        const { data: existingJobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('assigned_contractor_id', c.id)
          .eq('scheduled_date', date)
          .eq('scheduled_window', window)
          .not('status', 'in', '(cancelled,rescheduled)');

        if (!existingJobs || existingJobs.length < c.max_jobs_per_day) {
          available.push(c);
        }
      }
    }

    return NextResponse.json(available);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
