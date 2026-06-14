import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';
import ContractorInvite from '@/emails/contractor/ContractorInvite';
import BookingRequestReceived from '@/emails/customer/BookingRequestReceived';
import BookingConfirmed from '@/emails/customer/BookingConfirmed';
import React from 'react';

export async function GET() {
  try {
    const email = 'ayaanb132@gmail.com'; 

    // Send Invite (for testing template appearance)
    await sendEmail({
      to: email,
      subject: '[TEST] Contractor Invite',
      react: React.createElement(ContractorInvite, { fullName: 'Ayaan Baig', inviteLink: 'https://seaofblue.app/contractor/onboarding' })
    });

    // Send Booking Request
    await sendEmail({
      to: email,
      subject: '[TEST] Request Received',
      react: React.createElement(BookingRequestReceived, { customerName: 'Jane Smith', serviceType: 'Deep Clean', date: 'July 15, 2026', timeWindow: '8am-10am' })
    });

    // Send Booking Confirmed
    await sendEmail({
      to: email,
      subject: '[TEST] Booking Confirmed',
      react: React.createElement(BookingConfirmed, { customerName: 'Jane Smith', date: 'July 15, 2026', timeWindow: '8am-10am' })
    });

    return NextResponse.json({ success: true, message: 'Sent 3 test emails.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
