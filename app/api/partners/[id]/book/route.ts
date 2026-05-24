import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

const POSTING_FEE_RATE = 0.05;   // 5% posting fee charged to partner
const COMMISSION_RATE = 0.25;    // 25% commission earned by partner

// Book a job as a partner
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();
    const { id } = await params;
    const {
      address_line1, address_line2, city, postal_code,
      service_type, scheduled_date, scheduled_window,
      add_ons, access_instructions, partner_reference,
      home_bedrooms, home_bathrooms, home_size_sqft, has_pets,
      quoted_price, zone_id,
    } = body;

    if (!quoted_price || quoted_price <= 0) {
      return NextResponse.json({ error: 'quoted_price is required' }, { status: 400 });
    }

    // Get partner info
    const { data: partner } = await supabase
      .from('partners')
      .select('*, profile:profiles(email)')
      .eq('id', id)
      .single();

    if (!partner || !partner.is_active) {
      return NextResponse.json({ error: 'Partner not found or inactive' }, { status: 404 });
    }

    // Calculate financials
    const basePrice = parseFloat(quoted_price);
    const postingFee = Math.round(basePrice * POSTING_FEE_RATE * 100) / 100;
    const totalCharged = Math.round((basePrice + postingFee) * 100) / 100;
    const commissionEarned = Math.round(basePrice * COMMISSION_RATE * 100) / 100;

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

    // Create the job — quoted_price is the base price, total includes the fee
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        customer_id: customerId,
        zone_id: zone_id ?? partner.zone_id,
        service_type, scheduled_date, scheduled_window,
        address_line1, address_line2, city, postal_code,
        quoted_price: totalCharged, // Partner pays base + 5% fee
        add_ons: add_ons ?? [],
        access_instructions, home_bedrooms, home_bathrooms,
        home_size_sqft, has_pets: has_pets ?? false,
        deposit_amount: partner.invoice_billing ? 0 : Math.round(totalCharged * 0.3 * 100) / 100,
        status: 'confirmed', // Partners bypass lead stage
        admin_notes: JSON.stringify({
          partner_booking: true,
          partner_id: id,
          base_price: basePrice,
          posting_fee: postingFee,
          posting_fee_rate: POSTING_FEE_RATE,
          commission_earned: commissionEarned,
          commission_rate: COMMISSION_RATE,
        }),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Link to partner_bookings with financial metadata
    await supabase.from('partner_bookings').insert({
      partner_id: id,
      job_id: job.id,
      partner_reference: partner_reference ?? null,
      billing_notes: JSON.stringify({
        base_price: basePrice,
        posting_fee: postingFee,
        total_charged: totalCharged,
        commission_earned: commissionEarned,
      }),
    });

    return NextResponse.json({
      ...job,
      _financials: {
        base_price: basePrice,
        posting_fee: postingFee,
        total_charged: totalCharged,
        commission_earned: commissionEarned,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
