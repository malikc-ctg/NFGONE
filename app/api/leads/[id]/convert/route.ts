import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { sendEmail } from '@/lib/resend';
import BookingConfirmed from '@/emails/customer/BookingConfirmed';
import React from 'react';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

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

    if (!body.zone_id) {
      return NextResponse.json({ error: 'A zone must be selected to convert a lead.' }, { status: 400 });
    }

    if (!lead.service_type && !body.service_type) {
      return NextResponse.json({ error: 'Service type is missing from the lead.' }, { status: 400 });
    }

    // Find or create customer
    let customerId: string;
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', lead.customer_email)
      .maybeSingle();

    if (findError) {
      console.error('Error finding customer:', findError);
      throw findError;
    }

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      // Basic validation for new customer
      if (!lead.customer_email) {
        throw new Error('Lead must have an email address to be converted.');
      }

      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert({
          full_name: lead.customer_name ?? 'Unnamed Customer',
          email: lead.customer_email,
          phone: lead.customer_phone ?? '—',
          city: lead.city,
          zone_id: body.zone_id,
        })
        .select()
        .single();

      if (custError) {
        console.error('Error creating customer:', custError);
        throw custError;
      }
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
        address_line1: body.address_line1 || 'TBD',
        city: lead.city ?? body.city ?? 'TBD',
        postal_code: body.postal_code || 'TBD',
        quoted_price: body.quoted_price ?? lead.quoted_price ?? 0,
        home_bedrooms: lead.home_bedrooms,
        home_bathrooms: lead.home_bathrooms,
        home_size_sqft: lead.home_size_sqft,
        has_pets: lead.has_pets ?? false,
        add_ons: lead.add_ons ?? [],
        status: 'lead_received',
        deposit_amount: body.deposit_amount ?? 0,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job from lead:', jobError);
      throw jobError;
    }

    // Update lead status
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'converted',
        converted_job_id: job.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating lead status:', updateError);
    }

    // Send the Booking Confirmed email to the customer
    if (lead.customer_email) {
      await sendEmail({
        to: lead.customer_email,
        subject: `Your booking is confirmed for ${job.scheduled_date}`,
        react: React.createElement(BookingConfirmed, {
          customerName: lead.customer_name ?? 'Customer',
          date: job.scheduled_date || 'TBD',
          timeWindow: job.scheduled_window || 'TBD'
        })
      });
    }

    return NextResponse.json(job, { status: 201 });
  } catch (err: unknown) {
    console.error('Conversion process failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
