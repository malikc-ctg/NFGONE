import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { sendEmail } from '../lib/resend';
import ContractorInvite from '../emails/contractor/ContractorInvite';
import React from 'react';
import ws from 'ws';

// Polyfill WebSocket for Node.js 20
(global as any).WebSocket = ws;

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const full_name = 'Ayaan Baig';
  const email = 'ayaanb132@gmail.com';

  console.log('User already exists in Supabase, just triggering the email directly...');

  const actionLink = 'https://seaofblue.app/contractor/onboarding'; // Use generic onboarding link for now

  console.log('Sending real invite email...');
  const { success, error } = await sendEmail({
    to: email,
    subject: 'You have been invited to Sea of Blue',
    react: React.createElement(ContractorInvite, { fullName: full_name, inviteLink: actionLink })
  });

  if (!success) {
    console.error('Email failed:', error);
  } else {
    console.log('Real Invite sent successfully to Ayaan!');
  }
}

main().catch(console.error);
