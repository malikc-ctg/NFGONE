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
    const { data: employee, error: inviteError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', invite_id)
      .maybeSingle();

    if (inviteError) {
      throw new Error(`Failed to verify invite: ${inviteError.message}`);
    }

    if (!employee) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (employee.status !== 'invited') {
      return NextResponse.json({ error: 'This invite has already been accepted or is no longer valid.' }, { status: 400 });
    }

    // 2. Create or update Auth User
    let authUserId: string;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: employee.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone
      }
    });

    if (authError) {
      // If user already exists in auth, find and update them
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingAuth = users.find(u => u.email?.toLowerCase() === employee.email.toLowerCase());
      if (existingAuth) {
        authUserId = existingAuth.id;
        await supabase.auth.admin.updateUserById(authUserId, {
          password: password,
          user_metadata: { full_name: fullName, phone: phone }
        });
      } else {
        throw new Error(`Failed to create account: ${authError.message}`);
      }
    } else {
      authUserId = authData.user.id;
    }

    // 3. Ensure Profile Exists
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: authUserId, 
        email: employee.email,
        role: 'employee', 
        full_name: fullName, 
        phone: phone 
      }, { onConflict: 'id' });

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // 4. Update Employee Record
    const existingNotes = employee.notes ? JSON.parse(employee.notes) : {};
    const updatedNotes = {
        ...existingNotes,
        hq_address: hqAddress,
        hq_coords: hqCoords,
        max_radius: maxRadius
    };

    const { error: updateError } = await supabase
      .from('employees')
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
      throw new Error(`Failed to link employee record: ${updateError.message}`);
    }

    // 5. Insert Additional Zones
    if (additionalZoneIds && additionalZoneIds.length > 0) {
      await supabase.from('employee_zones').delete().eq('employee_id', invite_id);
      const zoneInserts = additionalZoneIds.map((zId: string) => ({
        employee_id: invite_id,
        zone_id: zId
      }));
      await supabase.from('employee_zones').insert(zoneInserts);
    }

    return NextResponse.json({ success: true, email: employee.email });

  } catch (err: any) {
    console.error('Onboard error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
