import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { applyDynamicPricing } from '@/lib/dynamic-pricing';
import { rateLimit } from '@/lib/rate-limit';
import type { ServiceType, TimeWindow } from '@/types';

export async function POST(request: NextRequest) {
  // Rate limit: 20 requests per minute per IP (public endpoint)
  const limited = rateLimit(request, { maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const {
      zone_id, service_type, scheduled_date, scheduled_window,
      home_bedrooms, home_bathrooms, has_pets,
      add_ons, customer_id,
    } = body;


    if (!zone_id || !service_type || !scheduled_date || !scheduled_window) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Base pricing calculation
    const supabase = await createServiceClient();
    const { data: config } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('service_type', service_type)
      .single();

    const basePrice = config?.base_price ?? 180;
    const bedroomAdder = config?.bedroom_adder ?? 15;
    const bathroomAdder = config?.bathroom_adder ?? 10;
    const petsAdder = config?.pets_surcharge ?? 20;

    const bedrooms = home_bedrooms ?? 2;
    const bathrooms = home_bathrooms ?? 1;

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
    if (has_pets) {
      addOnsPrice += petsAdder;
      lineItems.push({ label: 'Pets surcharge', amount: petsAdder });
    }

    const addOnsList: string[] = add_ons ?? [];
    const addOnPrices: Record<string, number> = {
      inside_fridge: 30, inside_oven: 30, inside_cabinets: 40,
      baseboards: 25, interior_windows: 50,
    };
    for (const ao of addOnsList) {
      const p = addOnPrices[ao] ?? 0;
      addOnsPrice += p;
      lineItems.push({ label: ao.replace(/_/g, ' '), amount: p });
    }

    const finalPrice = basePrice + addOnsPrice;
    const deposit = Math.round(finalPrice * 0.3 * 100) / 100;

    // Get customer credit balance if customer_id provided
    let customerCredit = 0;
    if (customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('id', customer_id)
        .single();
      customerCredit = (customer?.credit_balance as number) ?? 0;
    }

    const baseQuote = {
      service_type: service_type as ServiceType,
      base_price: basePrice,
      add_ons_price: addOnsPrice,
      final_price: finalPrice,
      deposit_amount: deposit,
      balance_due: finalPrice - deposit,
      line_items: lineItems,
    };

    const quote = await applyDynamicPricing({
      service_type: service_type as ServiceType,
      zone_id,
      requested_date: scheduled_date,
      requested_window: scheduled_window as TimeWindow,
      base_quote: baseQuote,
      customer_credit: customerCredit,
    });

    // Only return surge_reason — never the multiplier
    return NextResponse.json({
      ...quote,
      surge_multiplier: undefined, // explicitly strip from response
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
