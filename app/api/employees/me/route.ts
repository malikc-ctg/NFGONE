import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client to bypass RLS recursion issues while still filtering by user.id
    const serviceClient = await createServiceClient();
    const { data: employee, error: dbError } = await serviceClient
      .from('employees')
      .select('*, zone:zones!employees_zone_id_fkey(*), selected_zones:employee_zones(zone:zones(*))')
      .eq('profile_id', user.id)
      .single();



    if (dbError) {
      console.error('Database error fetching employee:', dbError);
      return NextResponse.json({ error: `Employee profile not found: ${dbError.message}` }, { status: 404 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee profile not found (empty result)' }, { status: 404 });
    }

    // Flatten selected_zones for easier frontend use
    const formattedEmployee = {
      ...employee,
      selected_zone_ids: employee.selected_zones?.map((sz: any) => sz.zone.id) || []
    };

    return NextResponse.json(formattedEmployee);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, zone_ids, max_radius, bio } = body;

    // Use service client to bypass RLS recursion issues
    const serviceClient = await createServiceClient();

    // First fetch current employee to get notes
    const { data: currentEmployee, error: fetchError } = await serviceClient
      .from('employees')
      .select('id, notes')
      .eq('profile_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const existingNotes = currentEmployee.notes ? JSON.parse(currentEmployee.notes) : {};
    if (max_radius !== undefined) {
      existingNotes.max_radius = max_radius;
    }
    if (bio !== undefined) {
      existingNotes.bio = bio;
    }

    // 1. Update basic employee info and notes
    const { data: employee, error: employeeError } = await serviceClient
      .from('employees')
      .update({
        full_name,
        phone,
        notes: JSON.stringify(existingNotes),
        updated_at: new Date().toISOString()
      })
      .eq('profile_id', user.id)
      .select()
      .single();

    if (employeeError) throw employeeError;

    // 2. Sync zones if provided
    if (Array.isArray(zone_ids)) {
      // Clear existing
      await serviceClient
        .from('employee_zones')
        .delete()
        .eq('employee_id', employee.id);

      // Insert new
      if (zone_ids.length > 0) {
        const zoneInserts = zone_ids.map(id => ({
          employee_id: employee.id,
          zone_id: id
        }));
        const { error: syncError } = await serviceClient
          .from('employee_zones')
          .insert(zoneInserts);
        
        if (syncError) throw syncError;
      }
    }


    return NextResponse.json(employee);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}


