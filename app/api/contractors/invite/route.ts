import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/api-auth';
import { sendEmail } from '@/lib/resend';
import ContractorInvite from '@/emails/contractor/ContractorInvite';
import React from 'react';

export async function POST(request: Request) {
  try {
    // Admin-only action
    // const auth = await requireRole(['admin']);
    // if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { full_name, email, phone, zone_id, tier, payout_rate, brings_own_supplies, has_vehicle, max_jobs_per_day } = body;

    if (!email || !full_name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Check if user already exists in auth
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (existingProfile) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // 2. Check if a contractor record already exists with this email
    const { data: existingContractor } = await supabase
      .from('contractors')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();

    let contractorId = existingContractor?.id;

    // 3. Create or update the contractor record
    if (existingContractor) {
      if (existingContractor.status !== 'invited') {
        return NextResponse.json({ error: 'A contractor with this email already exists and is not pending.' }, { status: 400 });
      }
      // Update existing invite
      const { error: updateError } = await supabase
        .from('contractors')
        .update({
          full_name,
          phone,
          zone_id: zone_id || null,
          tier: tier || 'basic',
          payout_rate: parseFloat(payout_rate) || 0.7,
          brings_own_supplies: !!brings_own_supplies,
          has_vehicle: !!has_vehicle,
          max_jobs_per_day: parseInt(max_jobs_per_day) || 2,
        })
        .eq('id', contractorId);
        
      if (updateError) throw new Error(`Failed to update contractor record: ${updateError.message}`);
    } else {
      // Create new invite
      const { data: newContractor, error: insertError } = await supabase
        .from('contractors')
        .insert({
          profile_id: null, // Will be set during onboarding
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
        })
        .select('id')
        .single();

      if (insertError) throw new Error(`Failed to create contractor record: ${insertError.message}`);
      contractorId = newContractor.id;
    }

    // 4. Generate the invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionLink = `${appUrl}/contractor/onboarding?invite_id=${contractorId}`;

    console.log('--- NEW ACTION LINK ---', actionLink);

    // 5. Send Email via React Email
    const { success, error: emailError } = await sendEmail({
      to: email,
      subject: 'You have been invited to Sea of Blue',
      react: React.createElement(ContractorInvite, { fullName: full_name, inviteLink: actionLink })
    });

    if (!success) {
      throw new Error(`Failed to send email: ${(emailError as any)?.message || 'Unknown error'}`);
    }

    return NextResponse.json({ success: true, inviteId: contractorId });

  } catch (err: any) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
