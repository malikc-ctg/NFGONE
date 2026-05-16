import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

// Book a job as a partner
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();
    const {
      address_line1, address_line2, city, postal_code,
      service_type, scheduled_date, scheduled_window,
      add_ons, access_instructions, partner_reference,
      home_bedrooms, home_bathrooms, home_size_sqft, has_pets,
      quoted_price, zone_id,
    } = body;

    // Get partner info
    const { data: partner } = await supabase
      .from('partners')
      .select('*, profile:profiles(email)')
      .eq('id', params.id)
      .single();

    if (!partner || !partner.is_active) {
      return NextResponse.json({ error: 'Partner not found or inactive' }, { status: 404 });
    }

    // Partners need a customer record — use partner email or create one
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', (partner.profile as { email: string }).email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id as string;
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          full_name: partner.company_name,
          email: (partner.profile as { email: string }).email,
          phone: '',
          zone_id: partner.zone_id,
        })
        .select('id')
        .single();
      customerId = newCustomer!.id as string;
    }

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        customer_id: customerId,
        zone_id: zone_id ?? partner.zone_id,
        service_type, scheduled_date, scheduled_window,
        address_line1, address_line2, city, postal_code,
        quoted_price, add_ons: add_ons ?? [],
        access_instructions, home_bedrooms, home_bathrooms,
        home_size_sqft, has_pets: has_pets ?? false,
        deposit_amount: partner.invoice_billing ? 0 : Math.round(quoted_price * 0.3 * 100) / 100,
        status: 'confirmed', // Partners bypass lead stage
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Link to partner_bookings
    await supabase.from('partner_bookings').insert({
      partner_id: params.id,
      job_id: job.id,
      partner_reference: partner_reference ?? null,
    });

    return NextResponse.json(job, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
