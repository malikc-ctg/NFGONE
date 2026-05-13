// Sea of Blue — Marketing Automation
// Three flows: abandoned booking recovery, win-back, recurring upsell.

import { createServiceClient } from '@/lib/supabase/server';

// ============================================================
// FLOW 1: Abandoned Booking Recovery
// ============================================================

export async function processAbandonedBookings(): Promise<void> {
  const supabase = await createServiceClient();
  const now = new Date();

  // Find sessions that reached step 4+ but haven't recovered
  const { data: sessions } = await supabase
    .from('booking_sessions')
    .select('*')
    .gte('last_step_completed', 4)
    .eq('recovered', false)
    .not('email', 'is', null);

  for (const session of sessions ?? []) {
    const createdAt = new Date(session.created_at as string);
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // 2-hour SMS
    if (hoursElapsed >= 2 && !session.recovery_email_1_sent_at && session.phone) {
      await sendAbandonedSMS(session.phone as string, session.session_token as string);
      await supabase
        .from('booking_sessions')
        .update({ recovery_email_1_sent_at: now.toISOString() })
        .eq('id', session.id);
    }

    // 24-hour email with saved quote
    if (hoursElapsed >= 24 && !session.recovery_email_2_sent_at && session.email) {
      await sendAbandonedEmail(session.email as string, session.quote, session.session_token as string);
      await supabase
        .from('booking_sessions')
        .update({ recovery_email_2_sent_at: now.toISOString() })
        .eq('id', session.id);
    }

    // 72-hour email with $15 discount
    if (hoursElapsed >= 72 && !session.recovery_email_3_sent_at && session.email) {
      const discountCode = `COMEBACK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await sendAbandonedDiscountEmail(session.email as string, discountCode, session.session_token as string);
      await supabase
        .from('booking_sessions')
        .update({
          recovery_email_3_sent_at: now.toISOString(),
          discount_code: discountCode,
        })
        .eq('id', session.id);
    }
  }
}

// ============================================================
// FLOW 2: Win-Back (60-day churned customers)
// ============================================================

export async function processWinBack(): Promise<void> {
  const supabase = await createServiceClient();
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Find customers who had 2+ completed jobs, last job 60+ days ago, no active recurring
  const { data: customers } = await supabase
    .from('customers')
    .select('id, email, full_name, phone')
    .eq('is_active', true);

  for (const customer of customers ?? []) {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, scheduled_date, status, created_at')
      .eq('customer_id', customer.id)
      .in('status', ['completed', 'reviewed', 'paid_out'])
      .order('scheduled_date', { ascending: false });

    if (!jobs || jobs.length < 2) continue;

    const lastJobDate = jobs[0].scheduled_date as string;
    if (lastJobDate >= sixtyDaysAgo) continue; // Not churned yet

    // Check no active recurring
    const { data: recurring } = await supabase
      .from('recurring_bookings')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('is_active', true)
      .single();

    if (recurring) continue;

    // Check they haven't been sent win-back recently
    const { data: recentWinback } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_email', customer.email)
      .eq('notification_type', 'win_back_day0')
      .gte('sent_at', ninetyDaysAgo)
      .single();

    if (recentWinback) continue;

    // Day 0: Send win-back email
    await sendWinBackEmail(customer.email as string, customer.full_name as string);

    await supabase.from('notifications').insert({
      recipient_email: customer.email,
      notification_type: 'win_back_day0',
      channel: 'email',
      sent_at: now.toISOString(),
      delivered: true,
    });
  }
}

// ============================================================
// FLOW 3: Recurring Upsell
// ============================================================

export async function processRecurringUpsell(): Promise<void> {
  const supabase = await createServiceClient();
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: customers } = await supabase
    .from('customers')
    .select('id, email, full_name, phone')
    .eq('is_active', true);

  for (const customer of customers ?? []) {
    // Check no active recurring plan
    const { data: recurring } = await supabase
      .from('recurring_bookings')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('is_active', true)
      .single();
    if (recurring) continue;

    // Get one-time jobs in last 90 days
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, scheduled_date, recurring_booking_id, status')
      .eq('customer_id', customer.id)
      .is('recurring_booking_id', null)
      .in('status', ['completed', 'reviewed', 'paid_out'])
      .gte('scheduled_date', ninetyDaysAgo)
      .order('scheduled_date', { ascending: false });

    if (!jobs || jobs.length < 2) continue;

    // Check upsell not already sent
    const { data: alreadySent } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_email', customer.email)
      .eq('notification_type', 'recurring_upsell')
      .single();
    if (alreadySent) continue;

    // Send upsell SMS
    if (customer.phone) {
      await sendRecurringUpsellSMS(customer.phone as string, customer.full_name as string);
    }

    await supabase.from('notifications').insert({
      recipient_email: customer.email,
      notification_type: 'recurring_upsell',
      channel: 'sms',
      sent_at: now.toISOString(),
      delivered: true,
    });
  }
}

// ============================================================
// Stub notification senders (connect to Resend + Twilio in prod)
// ============================================================

async function sendAbandonedSMS(phone: string, token: string): Promise<void> {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/booking?session=${token}`;
  console.log(`[SMS] → ${phone}: Your Sea of Blue quote is saved. Complete your booking: ${link}`);
  // TODO: Replace with Twilio SDK call
}

async function sendAbandonedEmail(email: string, quote: unknown, token: string): Promise<void> {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/booking?session=${token}`;
  console.log(`[EMAIL] → ${email}: Your cleaning quote is waiting. ${JSON.stringify(quote)}. Book: ${link}`);
  // TODO: Replace with Resend API call
}

async function sendAbandonedDiscountEmail(email: string, code: string, token: string): Promise<void> {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/booking?session=${token}&code=${code}`;
  console.log(`[EMAIL] → ${email}: $15 off your first clean. Use code ${code}: ${link}`);
}

async function sendWinBackEmail(email: string, name: string): Promise<void> {
  console.log(`[EMAIL] → ${email}: We miss you ${name}! $25 off your next clean.`);
  // TODO: Resend API
}

async function sendRecurringUpsellSMS(phone: string, name: string): Promise<void> {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/account/recurring/new`;
  console.log(`[SMS] → ${phone}: Hi ${name}, switch to biweekly and save. ${link}`);
}
