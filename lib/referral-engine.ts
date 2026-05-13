// Sea of Blue — Referral Engine

import { createServiceClient } from '@/lib/supabase/server';

// Generate a unique referral code like SOB-XK42Z
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed ambiguous chars
  let code = 'SOB-';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function ensureCustomerReferralCode(customerId: string): Promise<string> {
  const supabase = await createServiceClient();

  // Check if code already exists
  const { data: customer } = await supabase
    .from('customers')
    .select('referral_code')
    .eq('id', customerId)
    .single();

  if (customer?.referral_code) return customer.referral_code;

  // Generate unique code (retry up to 5x on collision)
  let code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateCode();
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('referral_code', code)
      .single();
    if (!existing) break;
  }

  await supabase
    .from('customers')
    .update({ referral_code: code })
    .eq('id', customerId);

  return code;
}

// Apply a referral code at booking — returns discount amount if valid
export async function applyReferralCode(
  code: string,
  newCustomerId: string
): Promise<{ discount: number; referral_id: string } | null> {
  const supabase = await createServiceClient();

  // Find the referrer customer
  const { data: referrer } = await supabase
    .from('customers')
    .select('id')
    .eq('referral_code', code)
    .single();

  if (!referrer) return null;

  // Can't self-refer
  if (referrer.id === newCustomerId) return null;

  // Check if this new customer already used a referral code
  const { data: existingReferral } = await supabase
    .from('customer_referrals')
    .select('id')
    .eq('referred_customer_id', newCustomerId)
    .single();

  if (existingReferral) return null;

  // Create referral record
  const { data: referral, error } = await supabase
    .from('customer_referrals')
    .insert({
      referrer_customer_id: referrer.id,
      referred_customer_id: newCustomerId,
      referral_code: code,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !referral) return null;

  return { discount: referral.referred_discount as number, referral_id: referral.id as string };
}

// Called after the referred customer completes their first job
export async function qualifyReferral(referredCustomerId: string): Promise<void> {
  const supabase = await createServiceClient();

  const { data: referral } = await supabase
    .from('customer_referrals')
    .select('*')
    .eq('referred_customer_id', referredCustomerId)
    .eq('status', 'pending')
    .single();

  if (!referral) return;

  // Credit the referrer
  await Promise.all([
    supabase
      .from('customers')
      .update({
        credit_balance: supabase.rpc('increment_credit', {
          p_customer_id: referral.referrer_customer_id,
          p_amount: referral.referrer_credit,
        }),
      })
      .eq('id', referral.referrer_customer_id),
    supabase
      .from('customer_referrals')
      .update({ status: 'qualified', qualified_at: new Date().toISOString() })
      .eq('id', referral.id),
  ]);
}

// Apply credit to a booking — returns credit amount applied
export async function applyCustomerCredit(
  customerId: string,
  jobPrice: number
): Promise<number> {
  const supabase = await createServiceClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('credit_balance')
    .eq('id', customerId)
    .single();

  if (!customer || !customer.credit_balance || customer.credit_balance <= 0) return 0;

  // Max 50% of job price can be covered by credit
  const creditToApply = Math.min(customer.credit_balance as number, jobPrice * 0.5);

  return Math.round(creditToApply * 100) / 100;
}

// Deduct credit after payment confirmed
export async function deductCustomerCredit(
  customerId: string,
  amount: number
): Promise<void> {
  const supabase = await createServiceClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('credit_balance')
    .eq('id', customerId)
    .single();

  if (!customer) return;

  const newBalance = Math.max(0, (customer.credit_balance as number) - amount);

  await supabase
    .from('customers')
    .update({ credit_balance: newBalance })
    .eq('id', customerId);
}

export async function getCustomerReferrals(customerId: string) {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('customer_referrals')
    .select('*, referred_customer:customers(full_name, created_at)')
    .eq('referrer_customer_id', customerId)
    .order('created_at', { ascending: false });

  return data ?? [];
}
