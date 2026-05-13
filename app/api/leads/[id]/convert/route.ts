import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServiceClient();
    const { id } = params;
    const body = await request.json();

    // Get lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Find or create customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', lead.customer_email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert({
          full_name: lead.customer_name ?? '',
          email: lead.customer_email ?? '',
          phone: lead.customer_phone ?? '',
          city: lead.city,
          zone_id: body.zone_id,
        })
        .select()
        .single();

      if (custError) throw custError;
      customerId = newCustomer.id;
    }

    // Create job from lead
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        lead_id: id,
        customer_id: customerId,
        zone_id: body.zone_id,
        service_type: lead.service_type ?? body.service_type,
        scheduled_date: body.scheduled_date ?? lead.preferred_date,
        scheduled_window: body.scheduled_window ?? lead.preferred_window ?? 'morning',
        address_line1: body.address_line1 ?? '',
        city: lead.city ?? body.city ?? '',
        postal_code: body.postal_code ?? '',
        quoted_price: body.quoted_price ?? lead.quoted_price ?? 0,
        home_bedrooms: lead.home_bedrooms,
        home_bathrooms: lead.home_bathrooms,
        home_size_sqft: lead.home_size_sqft,
        has_pets: lead.has_pets,
        add_ons: lead.add_ons ?? [],
        status: 'lead_received',
        deposit_amount: body.deposit_amount,
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Update lead status
    await supabase
      .from('leads')
      .update({
        status: 'converted',
        converted_job_id: job.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json(job, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
