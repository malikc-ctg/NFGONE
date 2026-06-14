'use server';

import { createServiceClient } from '@/lib/supabase/server';

export async function submitQuoteRequest(data: {
  category: string;
  address: string;
  description: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  quoted_price?: number;
  home_bedrooms?: number;
  home_bathrooms?: number;
  has_pets?: boolean;
  scheduled_date?: string;
  scheduled_window?: string;
}) {
  try {
    const supabase = await createServiceClient();

    // Map service category to the closest service_type enum if possible, or null
    // service_type ENUM: 'standard_clean','deep_clean','move_in_clean','move_out_clean','recurring_standard','recurring_deep'
    let service_type = null;
    if (data.category === 'House Cleaning') service_type = 'standard_clean';
    
    // Insert into leads table
    const { data: leadData, error } = await supabase
      .from('leads')
      .insert({
        source: 'website_quote',
        customer_name: `${data.firstName} ${data.lastName}`.trim(),
        customer_email: data.email,
        customer_phone: data.phone,
        city: data.address, // Store full address in city
        service_type: service_type, 
        condition: data.description,
        notes: `Requested Category: ${data.category}\nAddress: ${data.address}`,
        status: 'new',
        quoted_price: data.quoted_price,
        home_bedrooms: data.home_bedrooms,
        home_bathrooms: data.home_bathrooms,
        has_pets: data.has_pets || false,
        preferred_date: data.scheduled_date,
        preferred_window: data.scheduled_window,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting lead:', error);
      return { success: false, error: error.message };
    }

    return { success: true, lead: leadData };

  } catch (err: any) {
    console.error('Error submitting quote request:', err);
    return { success: false, error: 'Internal server error' };
  }
}

import { applyDynamicPricing } from '@/lib/dynamic-pricing';
import type { ServiceType, TimeWindow } from '@/types';

export async function getLiveQuote(data: {
  service_type: string;
  scheduled_date: string;
  scheduled_window: string;
  home_bedrooms: number;
  home_bathrooms: number;
  has_pets: boolean;
  add_ons: string[];
}) {
  try {
    const supabase = await createServiceClient();

    // 1. Get default zone
    const { data: zone } = await supabase.from('zones').select('id').limit(1).single();
    if (!zone) return { error: 'No service zones available' };

    // 2. Base pricing config
    const { data: config } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('service_type', data.service_type)
      .single();

    const basePrice = config?.base_price ?? 180;
    const bedroomAdder = config?.bedroom_adder ?? 15;
    const bathroomAdder = config?.bathroom_adder ?? 10;
    const petsAdder = config?.pets_surcharge ?? 20;

    const bedrooms = data.home_bedrooms ?? 2;
    const bathrooms = data.home_bathrooms ?? 1;

    let addOnsPrice = 0;
    const lineItems: Array<{ label: string; amount: number }> = [
      { label: 'Base price', amount: basePrice },
    ];

    if (bedrooms > 2) {
      const amt = (bedrooms - 2) * bedroomAdder;
      addOnsPrice += amt;
      lineItems.push({ label: `Extra bedrooms (${bedrooms - 2})`, amount: amt });
    }
    if (bathrooms > 1) {
      const amt = (bathrooms - 1) * bathroomAdder;
      addOnsPrice += amt;
      lineItems.push({ label: `Extra bathrooms (${bathrooms - 1})`, amount: amt });
    }
    if (data.has_pets) {
      addOnsPrice += petsAdder;
      lineItems.push({ label: 'Pets surcharge', amount: petsAdder });
    }

    const addOnPrices: Record<string, number> = {
      inside_fridge: 30, inside_oven: 30, inside_cabinets: 40,
      baseboards: 25, interior_windows: 50,
    };
    for (const ao of data.add_ons || []) {
      const p = addOnPrices[ao] ?? 0;
      addOnsPrice += p;
      lineItems.push({ label: ao.replace(/_/g, ' '), amount: p });
    }

    const finalPrice = basePrice + addOnsPrice;
    const deposit = Math.round(finalPrice * 0.3 * 100) / 100;

    const baseQuote = {
      service_type: data.service_type as ServiceType,
      base_price: basePrice,
      add_ons_price: addOnsPrice,
      final_price: finalPrice,
      deposit_amount: deposit,
      balance_due: finalPrice - deposit,
      line_items: lineItems,
    };

    const quote = await applyDynamicPricing({
      service_type: data.service_type as ServiceType,
      zone_id: zone.id,
      requested_date: data.scheduled_date,
      requested_window: data.scheduled_window as TimeWindow,
      base_quote: baseQuote,
      customer_credit: 0, // Guest quote
    });

    return { success: true, quote };
  } catch (err: any) {
    console.error('Error generating live quote:', err);
    return { error: 'Failed to generate quote' };
  }
}

