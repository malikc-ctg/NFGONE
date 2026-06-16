'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/resend';
import BookingRequestReceived from '@/emails/customer/BookingRequestReceived';
import React from 'react';

export async function submitInternalQuoteRequest(data: {
  category: string;
  description: string;
  quoted_price?: number;
  home_bedrooms?: number;
  home_bathrooms?: number;
  has_pets?: boolean;
  scheduled_date?: string;
  scheduled_window?: string;
}) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to request a quote.' };
    }

    // 2. Fetch full customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('profile_id', user.id)
      .single();

    if (customerError || !customer) {
      return { success: false, error: 'Could not fetch your customer profile.' };
    }

    // 3. Map service category to the closest service_type enum
    let service_type = null;
    if (data.category === 'Standard Clean') service_type = 'standard_clean';
    else if (data.category === 'Deep Clean') service_type = 'deep_clean';
    else if (data.category === 'Move In/Out Clean') service_type = 'move_in_clean';
    else if (data.category === 'Recurring Standard') service_type = 'recurring_standard';
    else if (data.category === 'Recurring Deep') service_type = 'recurring_deep';
    else service_type = 'standard_clean'; // fallback
    
    // 4. Insert into leads table (using service client because leads is protected)
    const { data: leadData, error: leadError } = await serviceClient
      .from('leads')
      .insert({
        source: 'customer_app',
        customer_name: customer.full_name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        city: customer.address_line1 + (customer.city ? `, ${customer.city}` : ''),
        service_type: service_type, 
        condition: data.description,
        notes: `Requested via Customer Portal.\nCategory: ${data.category}`,
        status: 'new',
        quoted_price: data.quoted_price,
        home_bedrooms: data.home_bedrooms,
        home_bathrooms: data.home_bathrooms,
        has_pets: data.has_pets || false,
        preferred_date: data.scheduled_date,
        preferred_window: data.scheduled_window,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Supabase error inserting internal lead:', leadError);
      return { success: false, error: leadError.message };
    }

    // 5. Send confirmation email to the customer
    if (customer.email) {
      await sendEmail({
        to: customer.email,
        subject: 'Quote Request Received - Sea of Blue',
        react: React.createElement(BookingRequestReceived, {
          customerName: customer.full_name?.split(' ')[0] || 'Customer',
          serviceType: data.category,
          date: data.scheduled_date || 'a future date',
          timeWindow: data.scheduled_window || 'the preferred time'
        })
      });
    }

    return { success: true, lead: leadData };

  } catch (err: any) {
    console.error('Error submitting internal quote request:', err);
    return { success: false, error: 'Internal server error' };
  }
}
