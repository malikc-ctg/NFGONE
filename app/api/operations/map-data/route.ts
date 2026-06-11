import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { format } from 'date-fns';

export async function GET() {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const today = format(new Date(), 'yyyy-MM-dd');

    const [jobsRes, contractorLocsRes, zonesRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, job_number, status, service_type, scheduled_date, scheduled_window, address_line1, city, postal_code, quoted_price, latitude, longitude, customer:customers(full_name, phone), contractor:contractors(id, full_name, phone, tier)')
        .eq('scheduled_date', today)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null),

      supabase
        .from('contractor_locations')
        .select('*, contractor:contractors(id, full_name, phone, tier, status, zone_id)')
        .eq('is_active', true),

      supabase
        .from('zones')
        .select('id, name, city, is_active, areas')
        .eq('is_active', true),
    ]);

    if (jobsRes.error) throw jobsRes.error;
    if (contractorLocsRes.error) throw contractorLocsRes.error;
    if (zonesRes.error) throw zonesRes.error;

    return NextResponse.json({
      jobs: jobsRes.data ?? [],
      contractorLocations: contractorLocsRes.data ?? [],
      zones: zonesRes.data ?? [],
    });
  } catch (err: unknown) {
    console.error('GET /api/operations/map-data error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
