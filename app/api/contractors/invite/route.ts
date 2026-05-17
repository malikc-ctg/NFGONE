import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in the environment variables');
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await request.json();
    const { full_name, email, phone, zone_id, tier, payout_rate, brings_own_supplies, has_vehicle, max_jobs_per_day } = body;

    if (!email || !full_name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const isExisting = existingUser?.users?.some(u => u.email === email);
    
    if (isExisting) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // 2. Generate invite link (this creates the user in auth.users)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: { full_name, phone }
      }
    });

    if (inviteError) {
      throw new Error(`Failed to generate invite: ${inviteError.message}`);
    }

    const authUserId = inviteData.user.id;

    // 3. The handle_new_user trigger just created a profile with 'customer' role.
    // Let's update it to 'contractor' and update the name/phone.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'contractor', full_name, phone })
      .eq('id', authUserId);

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

    // 5. Send Email via Resend
    // Wait, the action link returned by generateLink already includes the token and redirects them.
    // The link from Supabase is: inviteData.properties.action_link
    // BUT we want to ensure they go to our onboarding page.
    // By default, the invite link redirects to the Site URL (or NEXT_PUBLIC_SITE_URL).
    // Let's use the raw action_link from Supabase, but add a redirectTo parameter if needed.
    const actionLink = inviteData.properties.action_link;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1d4ed8;">Welcome to Sea of Blue!</h2>
        <p>Hi ${full_name.split(' ')[0]},</p>
        <p>You have been invited to join the Sea of Blue platform as a contractor.</p>
        <p>To get started, please click the button below to complete your onboarding profile and set your password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${actionLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Onboarding</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${actionLink}</p>
        <p>Best regards,<br>The Sea of Blue Team</p>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: 'Sea of Blue <onboarding@nfgone.ca>',
      to: email,
      subject: 'You are invited to join Sea of Blue',
      html: emailHtml,
    });

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
