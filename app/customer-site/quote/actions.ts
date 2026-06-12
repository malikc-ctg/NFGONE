'use server';

import { createServiceClient } from '@/lib/supabase/server';

export async function submitQuoteRequest(data: {
  category: string;
  address: string;
  description: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  try {
    const supabase = await createServiceClient();

    // Map service category to the closest service_type enum if possible, or null
    // service_type ENUM: 'standard_clean','deep_clean','move_in_clean','move_out_clean','recurring_standard','recurring_deep'
    let service_type = null;
    if (data.category === 'House Cleaning') service_type = 'standard_clean';
    
    // Insert into leads table
    const { data: leadData, error } = await supabase
      .from('leads')
      .insert({
        source: 'website_quote',
        customer_name: `${data.firstName} ${data.lastName}`.trim(),
        customer_email: data.email,
        customer_phone: data.phone,
        city: data.address, // Store full address in city
        service_type: service_type, 
        condition: data.description,
        notes: `Requested Category: ${data.category}\nAddress: ${data.address}`,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting lead:', error);
      return { success: false, error: error.message };
    }

    return { success: true, lead: leadData };

  } catch (err: any) {
    console.error('Error submitting quote request:', err);
    return { success: false, error: 'Internal server error' };
  }
}
