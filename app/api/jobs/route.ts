import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';
import { requireAuth } from '@/lib/api-auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const limited = rateLimit(request, { maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();

    const {
      customer_id, zone_id, service_type, scheduled_date,
      scheduled_window, address_line1, address_line2, city,
      postal_code, quoted_price, access_instructions,
      home_bedrooms, home_bathrooms, home_size_sqft,
      has_pets, add_ons, scope_notes, lead_id,
      estimated_duration_minutes, deposit_amount,
    } = body;

    if (!customer_id || !zone_id || !service_type || !scheduled_date ||
        !scheduled_window || !address_line1 || !city || !postal_code || !quoted_price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        customer_id, zone_id, service_type, scheduled_date,
        scheduled_window, address_line1, address_line2, city,
        postal_code, quoted_price, access_instructions,
        home_bedrooms, home_bathrooms, home_size_sqft,
        has_pets: has_pets ?? false,
        add_ons: add_ons ?? [],
        scope_notes, lead_id,
        estimated_duration_minutes: estimated_duration_minutes ?? 180,
        deposit_amount: deposit_amount ?? Math.round(quoted_price * 0.3 * 100) / 100,
        status: 'lead_received',
      })
      .select()
      .single();

    if (error) throw error;

    // Geocode the address and update the job (non-blocking)
    geocodeAddress(address_line1, city, postal_code)
      .then(async (coords) => {
        if (coords) {
          await supabase
            .from('jobs')
            .update({ latitude: coords.latitude, longitude: coords.longitude })
            .eq('id', data.id);
        }
      })
      .catch((err) => console.error('Geocoding failed for job:', data.id, err));

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error('POST /api/jobs error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);

    let query = supabase
      .from('jobs')
      .select('*, customer:customers(*), contractor:contractors(*), zone:zones(*)')
      .order('scheduled_date', { ascending: false });

    const status = searchParams.get('status');
    if (status) query = query.eq('status', status);

    const date = searchParams.get('date');
    if (date) query = query.eq('scheduled_date', date);

    const zone_id = searchParams.get('zone_id');
    if (zone_id) query = query.eq('zone_id', zone_id);

    const contractor_id = searchParams.get('contractor_id');
    if (contractor_id) query = query.eq('assigned_contractor_id', contractor_id);

    const limit = searchParams.get('limit');
    if (limit) query = query.limit(parseInt(limit));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('GET /api/jobs error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
