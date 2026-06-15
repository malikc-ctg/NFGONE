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

    const [jobsRes, contractorLocsRes, zonesRes, activeContractorsRes] = await Promise.all([
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

      supabase
        .from('contractors')
        .select('id, full_name, phone, status, notes')
        .eq('status', 'active'),
    ]);

    if (jobsRes.error) throw jobsRes.error;
    if (contractorLocsRes.error) throw contractorLocsRes.error;
    if (zonesRes.error) throw zonesRes.error;
    if (activeContractorsRes.error) throw activeContractorsRes.error;

    const contractorHQs = (activeContractorsRes.data ?? []).map(contractor => {
      let hq_coords = null;
      try {
        if (contractor.notes) {
          const notesObj = JSON.parse(contractor.notes);
          if (notesObj.hq_coords && typeof notesObj.hq_coords.lat === 'number' && typeof notesObj.hq_coords.lng === 'number') {
            hq_coords = notesObj.hq_coords;
          }
        }
      } catch (e) {
        console.warn(`Failed to parse notes for contractor ${contractor.id}`);
      }
      return {
        id: contractor.id,
        full_name: contractor.full_name,
        phone: contractor.phone,
        status: contractor.status,
        latitude: hq_coords?.lat || null,
        longitude: hq_coords?.lng || null,
      };
    }).filter(hq => hq.latitude !== null && hq.longitude !== null);

    return NextResponse.json({
      jobs: jobsRes.data ?? [],
      contractorLocations: contractorLocsRes.data ?? [],
      zones: zonesRes.data ?? [],
      contractorHQs,
    });
  } catch (err: unknown) {
    console.error('GET /api/operations/map-data error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

