import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/booking — public endpoint, no auth required
// Creates a lead record from the customer booking wizard
export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per minute per IP
  const limited = rateLimit(request, { maxRequests: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const supabase = await createServiceClient();
    const body = await request.json();

    const {
      service_type, scheduled_date, scheduled_window,
      home_bedrooms, home_bathrooms, home_size_sqft,
      has_pets, add_ons, quoted_price,
      full_name, email, phone,
      address_line1, city, postal_code, access_instructions,
      source,
    } = body;

    // Validate required fields
    if (!full_name || !email || !phone || !service_type || !scheduled_date || !address_line1 || !city || !postal_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a lead record
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        source: source ?? 'website',
        customer_name: full_name,
        customer_phone: phone,
        customer_email: email,
        city,
        service_type,
        preferred_date: scheduled_date,
        preferred_window: scheduled_window ?? 'morning',
        home_bedrooms: home_bedrooms ?? null,
        home_bathrooms: home_bathrooms ?? null,
        home_size_sqft: home_size_sqft ?? null,
        has_pets: has_pets ?? false,
        add_ons: add_ons ?? [],
        quoted_price: quoted_price ?? null,
        notes: access_instructions
          ? `Address: ${address_line1}, ${city}, ${postal_code}\nAccess: ${access_instructions}`
          : `Address: ${address_line1}, ${city}, ${postal_code}`,
        status: 'new',
      })
      .select()
      .single();

    if (leadError) throw leadError;

    return NextResponse.json({ lead_id: lead.id, status: 'received' }, { status: 201 });
  } catch (err: unknown) {
    console.error('POST /api/booking error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
