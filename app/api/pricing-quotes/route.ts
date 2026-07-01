import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const schema = z.object({
  // Contact info
  customer_name: z.string().min(1),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional().default('inbound_call'),

  // Pricing engine fields
  property_type: z.enum(['condo', 'basement', 'house']),
  package_name: z.string(),
  frequency: z.enum(['one_time', 'monthly', 'biweekly', 'weekly']).default('one_time'),
  selected_add_ons: z.array(z.string()),
  add_on_quantities: z.record(z.string(), z.number()).optional().default({}),
  custom_add_on_prices: z.record(z.string(), z.number()).optional().default({}),

  // Property details
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  half_bathrooms: z.number().min(0).optional().default(0),
  sqft: z.number().min(0),

  // Quote result (calculated client-side, stored for audit)
  calculated_price: z.number(),
  price_min: z.number().nullable().optional(),
  price_max: z.number().nullable().optional(),
  is_range: z.boolean().optional().default(false),
  is_custom_quote: z.boolean().optional().default(false),
  vacancy_confirmed: z.boolean().optional(),
  breakdown: z.any(),
  estimated_hours: z.number().optional(),
  scope_of_work_text: z.string().optional(),

  // Legacy fields (kept for backward compat, optional)
  selected_tasks: z.array(z.string()).optional().default([]),
  conditions: z.array(z.string()).optional().default([]),
  modifiers: z.object({
    sameDay: z.boolean().optional(),
    afterHours: z.boolean().optional(),
  }).optional().default({}),
  add_ons: z.array(z.string()).optional().default([]),
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
        source: data.source,
        home_bedrooms: data.bedrooms,
        home_bathrooms: data.bathrooms + (data.half_bathrooms || 0),
        home_size_sqft: data.sqft,
        notes: `Quote: ${data.package_name} — ${data.property_type} ${data.sqft} sqft, ${data.bedrooms} Bed / ${data.bathrooms} Bath. Add-ons: ${data.selected_add_ons.join(', ') || 'None'}`,
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
        property_type: data.property_type,
        frequency: data.frequency,
        selected_tasks: data.selected_add_ons,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        half_bathrooms: data.half_bathrooms || 0,
        sqft: data.sqft,
        conditions: data.conditions,
        modifiers: data.modifiers,
        add_ons: data.add_ons,
        calculated_price: data.calculated_price,
        price_min: data.price_min || null,
        price_max: data.price_max || null,
        is_range: data.is_range || false,
        is_custom_quote: data.is_custom_quote || false,
        vacancy_confirmed: data.vacancy_confirmed ?? null,
        breakdown: data.breakdown,
        estimated_hours: data.estimated_hours,
        scope_of_work_text: data.scope_of_work_text || null,
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
