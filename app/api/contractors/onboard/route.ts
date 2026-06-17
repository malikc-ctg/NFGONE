import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      invite_id, 
      password, 
      fullName, 
      phone, 
      hqAddress, 
      hqCoords, 
      maxRadius, 
      primaryZoneId, 
      additionalZoneIds, 
      bringsOwnSupplies, 
      hasVehicle 
    } = body;

    if (!invite_id || !password || !fullName || !phone || !primaryZoneId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Verify Invite
    const { data: contractor, error: inviteError } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', invite_id)
      .maybeSingle();

    if (inviteError) {
      throw new Error(`Failed to verify invite: ${inviteError.message}`);
    }

    if (!contractor) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (contractor.status !== 'invited') {
      return NextResponse.json({ error: 'This invite has already been accepted or is no longer valid.' }, { status: 400 });
    }

    // 2. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: contractor.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone
      }
    });

    if (authError) {
      // If user already exists in auth, that means they signed up another way.
      // We might want to handle this gracefully in the future, but for now we fail.
      throw new Error(`Failed to create account: ${authError.message}`);
    }

    const authUserId = authData.user.id;

    // 3. Ensure Profile Exists
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: authUserId, 
        email: contractor.email,
        role: 'contractor', 
        full_name: fullName, 
        phone: phone 
      }, { onConflict: 'id' });

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // 4. Update Contractor Record
    const existingNotes = contractor.notes ? JSON.parse(contractor.notes) : {};
    const updatedNotes = {
        ...existingNotes,
        hq_address: hqAddress,
        hq_coords: hqCoords,
        max_radius: maxRadius
    };

    const { error: updateError } = await supabase
      .from('contractors')
      .update({
        profile_id: authUserId,
        full_name: fullName,
        phone: phone,
        status: 'active',
        zone_id: primaryZoneId,
        brings_own_supplies: bringsOwnSupplies,
        has_vehicle: hasVehicle,
        notes: JSON.stringify(updatedNotes)
      })
      .eq('id', invite_id);

    if (updateError) {
      throw new Error(`Failed to link contractor record: ${updateError.message}`);
    }

    // 5. Insert Additional Zones
    if (additionalZoneIds && additionalZoneIds.length > 0) {
      await supabase.from('contractor_zones').delete().eq('contractor_id', invite_id);
      const zoneInserts = additionalZoneIds.map((zId: string) => ({
        contractor_id: invite_id,
        zone_id: zId
      }));
      await supabase.from('contractor_zones').insert(zoneInserts);
    }

    return NextResponse.json({ success: true, email: contractor.email });

  } catch (err: any) {
    console.error('Onboard error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
