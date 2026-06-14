import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';
import ContractorInvite from '@/emails/contractor/ContractorInvite';
import BookingRequestReceived from '@/emails/customer/BookingRequestReceived';
import BookingConfirmed from '@/emails/customer/BookingConfirmed';
import ContractorAssigned from '@/emails/customer/ContractorAssigned';
import JobAssigned from '@/emails/contractor/JobAssigned';
import ContractorEnRoute from '@/emails/customer/ContractorEnRoute';
import ServiceStarted from '@/emails/customer/ServiceStarted';
import ServiceCompleted from '@/emails/customer/ServiceCompleted';
import ReviewRequest from '@/emails/customer/ReviewRequest';
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

    // BATCH 2 TESTS
    await sendEmail({
      to: email,
      subject: '[TEST] Your Cleaner is Set',
      react: React.createElement(ContractorAssigned, { customerName: 'Jane Smith', date: 'July 15, 2026', timeWindow: '8am-10am' })
    });

    await sendEmail({
      to: email,
      subject: '[TEST] New Job Assigned',
      react: React.createElement(JobAssigned, { contractorName: 'Ayaan Baig', date: 'July 15, 2026', timeWindow: '8am-10am', location: '123 Main St, Miami', jobDetails: 'Deep Clean', dashboardLink: 'https://seaofblue.app/contractor' })
    });

    await sendEmail({
      to: email,
      subject: '[TEST] Your Cleaner is On the Way',
      react: React.createElement(ContractorEnRoute, { customerName: 'Jane Smith', arrivalTime: '8:15am' })
    });

    await sendEmail({
      to: email,
      subject: '[TEST] Service Started',
      react: React.createElement(ServiceStarted, { customerName: 'Jane Smith', startTime: '8:30am' })
    });

    await sendEmail({
      to: email,
      subject: '[TEST] All Done!',
      react: React.createElement(ServiceCompleted, { customerName: 'Jane Smith', completionTime: '11:00am' })
    });

    await sendEmail({
      to: email,
      subject: '[TEST] How did we do?',
      react: React.createElement(ReviewRequest, { customerName: 'Jane Smith', date: 'July 15, 2026', reviewLink: 'https://seaofblue.app/reviews' })
    });

    return NextResponse.json({ success: true, message: 'Sent 9 test emails.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
