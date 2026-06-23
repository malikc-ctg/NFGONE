import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const schema = z.object({
  customer_name: z.string().min(1),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  address: z.string().optional(),
  package_name: z.string(),
  selected_tasks: z.array(z.string()),
  bedrooms: z.number().min(1),
  bathrooms: z.number().min(1),
  sqft: z.number().min(0),
  conditions: z.array(z.string()),
  modifiers: z.object({
    sameDay: z.boolean(),
    afterHours: z.boolean(),
  }),
  add_ons: z.array(z.string()),
  calculated_price: z.number(),
  breakdown: z.any(),
  estimated_hours: z.number()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const supabase = await createServiceClient();

    // 1. Create Lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone || null,
        customer_email: data.customer_email || null,
        city: data.address || null,
        service_type: data.package_name,
        quoted_price: data.calculated_price,
        status: 'new',
        source: 'inbound_call',
        notes: `Quote: ${data.package_name} - ${data.bedrooms} Bed, ${data.bathrooms} Bath, ${data.sqft} Sqft. Extras: ${data.selected_tasks.join(', ')}`,
      })
      .select()
      .single();

    if (leadError) throw leadError;

    // 2. Create Pricing Quote record linked to Lead
    const { data: quote, error: quoteError } = await supabase
      .from('pricing_quotes')
      .insert({
        lead_id: lead.id,
        package_name: data.package_name,
        selected_tasks: data.selected_tasks,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        sqft: data.sqft,
        conditions: data.conditions,
        modifiers: data.modifiers,
        add_ons: data.add_ons,
        calculated_price: data.calculated_price,
        breakdown: data.breakdown,
        estimated_hours: data.estimated_hours,
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Quote Error:', quoteError);
      // We don't rollback the lead, just log the error since it's an internal tracking table
      // But we can throw if we strictly want it attached.
      throw quoteError;
    }

    return NextResponse.json({ success: true, lead, quote });
  } catch (err: any) {
    console.error('Error generating pricing quote:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
