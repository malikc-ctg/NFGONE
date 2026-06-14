import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';

// Initialize the Resend client using the server-side environment variable.
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('RESEND_API_KEY is not set. Emails will not be sent.');
}

const resend = new Resend(resendApiKey || 'dummy_key');

/**
 * Core utility for dispatching automated emails using Resend and React Email.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
}) {
  if (!resendApiKey) {
    console.log(`[STUB EMAIL] Would have sent to ${to}: ${subject}`);
    return { success: true, dummy: true };
  }

  try {
    const html = render(react);
    
    const { data, error } = await resend.emails.send({
      from: 'Sea of Blue <support@seaofblue.app>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send email via Resend:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error };
  }
}
