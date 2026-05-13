import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

function generateReferralCode(): string {
  return 'SOB-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

// POST /api/partners/create — Admin only, invite-only
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await request.json();
    const { email, full_name, company_name, partner_type, zone_id, commission_rate, billing_email, notes } = body;

    if (!email || !full_name || !company_name || !partner_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name },
    });

    if (authError || !authData.user) throw authError ?? new Error('Auth user creation failed');

    const userId = authData.user.id;

    // Create profile with partner role
    await supabase.from('profiles').insert({
      id: userId,
      role: 'partner',
      full_name,
      email,
    });

    // Generate unique referral code
    let referralCode = '';
    for (let i = 0; i < 5; i++) {
      referralCode = generateReferralCode();
      const { data: existing } = await supabase
        .from('partners')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      if (!existing) break;
    }

    // Create partner record
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        profile_id: userId,
        company_name,
        partner_type,
        zone_id: zone_id ?? null,
        commission_rate: commission_rate ?? 0.05,
        billing_email: billing_email ?? email,
        referral_code: referralCode,
        notes: notes ?? null,
        invoice_billing: false, // admin flips this manually once partner is established
        is_active: true,
      })
      .select()
      .single();

    if (partnerError) throw partnerError;

    // Send invite email (TODO: wire to Resend)
    console.log(`[INVITE EMAIL] → ${email}: Welcome to Sea of Blue partner portal. Set your password at /partner/login`);

    return NextResponse.json(partner, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const zone_id = searchParams.get('zone_id');

    let query = supabase
      .from('partners')
      .select('*, zone:zones(name), profile:profiles(full_name, email)')
      .order('company_name');

    if (zone_id) query = query.eq('zone_id', zone_id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
