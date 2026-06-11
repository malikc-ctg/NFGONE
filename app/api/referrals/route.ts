import { createServiceClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { applyReferralCode, getCustomerReferrals, ensureCustomerReferralCode } from '@/lib/referral-engine';

export async function GET(request: NextRequest) {
  // GET code for a customer, or apply code
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // Get the user's role and ID
    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    }

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get('customer_id');
    const action = searchParams.get('action');

    if (!customer_id) return NextResponse.json({ error: 'customer_id required' }, { status: 400 });

    // Security Check: Only the customer or an admin can access this data
    if (!isAdmin && user?.id !== customer_id) {
      return NextResponse.json({ error: 'Unauthorized access to referral data' }, { status: 403 });
    }

    if (action === 'history') {
      const referrals = await getCustomerReferrals(customer_id);
      return NextResponse.json(referrals);
    }

    // Default: return the customer's referral code (create if needed)
    const code = await ensureCustomerReferralCode(customer_id);
    const { data: customer } = await supabase
      .from('customers')
      .select('credit_balance')
      .eq('id', customer_id)
      .single();

    return NextResponse.json({
      code,
      credit_balance: customer?.credit_balance ?? 0,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Apply a referral code for a new customer
  try {
    const body = await request.json();
    const { code, customer_id } = body;

    if (!code || !customer_id) {
      return NextResponse.json({ error: 'code and customer_id required' }, { status: 400 });
    }

    const result = await applyReferralCode(code, customer_id);
    if (!result) {
      return NextResponse.json({ error: 'Invalid or already used referral code' }, { status: 400 });
    }

    return NextResponse.json({ discount: result.discount, referral_id: result.referral_id });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
