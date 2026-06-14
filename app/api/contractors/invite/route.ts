import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/api-auth';
import { sendEmail } from '@/lib/resend';
import ContractorInvite from '@/emails/contractor/ContractorInvite';
import React from 'react';

export async function POST(request: Request) {
  try {
    // Admin-only action
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { full_name, email, phone, zone_id, tier, payout_rate, brings_own_supplies, has_vehicle, max_jobs_per_day } = body;

    if (!email || !full_name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Check if user already exists (efficient lookup via profiles table)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (existingProfile) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // 2. Generate invite link (this creates the user in auth.users)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: { full_name, phone },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.seaofblue.app'}/contractor/onboarding`
      }
    });

    if (inviteError) {
      throw new Error(`Failed to generate invite: ${inviteError.message}`);
    }

    const authUserId = inviteData.user.id;

    // 3. The handle_new_user trigger SHOULD have created a profile, but if generateLink 
    // bypasses the trigger, we upsert manually to ensure the profile row exists.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: authUserId, 
        email: email,
        role: 'contractor', 
        full_name, 
        phone 
      }, { onConflict: 'id' });

    if (profileError) {
      throw new Error(`Failed to update profile role: ${profileError.message}`);
    }

    // 4. Create the contractor record
    const { error: contractorError } = await supabase
      .from('contractors')
      .insert({
        profile_id: authUserId,
        full_name,
        email,
        phone,
        zone_id: zone_id || null,
        status: 'invited',
        tier: tier || 'basic',
        payout_rate: parseFloat(payout_rate) || 0.7,
        brings_own_supplies: !!brings_own_supplies,
        has_vehicle: !!has_vehicle,
        max_jobs_per_day: parseInt(max_jobs_per_day) || 2,
      });

    if (contractorError) {
      throw new Error(`Failed to create contractor record: ${contractorError.message}`);
    }

    // 5. Send Email via React Email
    const actionLink = inviteData.properties.action_link;

    const { success, error: emailError } = await sendEmail({
      to: email,
      subject: 'You have been invited to Sea of Blue',
      react: React.createElement(ContractorInvite, { fullName: full_name, inviteLink: actionLink })
    });

    if (!success) {
      throw new Error(`Failed to send email: ${emailError?.message || 'Unknown error'}`);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
