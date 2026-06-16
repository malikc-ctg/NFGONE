import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    const { data: customer, error: dbError } = await serviceClient
      .from('customers')
      .select('*, zone:zones(*)')
      .eq('profile_id', user.id)
      .single();

    if (dbError || !customer) {
      return NextResponse.json(null);
    }

    return NextResponse.json(customer);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const serviceClient = await createServiceClient();

    // First fetch current to preserve notes
    const { data: currentCustomer } = await serviceClient
      .from('customers')
      .select('notes')
      .eq('profile_id', user.id)
      .single();

    const existingNotes = currentCustomer?.notes ? JSON.parse(currentCustomer.notes) : {};
    
    // Update notes with any onboarding properties
    if (body.home_size_sqft) existingNotes.home_size_sqft = body.home_size_sqft;
    if (body.bedrooms) existingNotes.bedrooms = body.bedrooms;
    if (body.bathrooms) existingNotes.bathrooms = body.bathrooms;
    if (body.has_pets !== undefined) existingNotes.has_pets = body.has_pets;
    if (body.parking_instructions) existingNotes.parking_instructions = body.parking_instructions;
    if (body.entry_instructions) existingNotes.entry_instructions = body.entry_instructions;
    if (body.is_onboarded) existingNotes.is_onboarded = body.is_onboarded;

    const updatePayload: any = {
      notes: JSON.stringify(existingNotes),
      updated_at: new Date().toISOString()
    };

    if (body.full_name) updatePayload.full_name = body.full_name;
    if (body.phone) updatePayload.phone = body.phone;
    if (body.address_line1) updatePayload.address_line1 = body.address_line1;
    if (body.city) updatePayload.city = body.city;
    if (body.province) updatePayload.province = body.province;
    if (body.postal_code) updatePayload.postal_code = body.postal_code;

    const { data: customer, error } = await serviceClient
      .from('customers')
      .upsert({ ...updatePayload, profile_id: user.id }, { onConflict: 'profile_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(customer);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
