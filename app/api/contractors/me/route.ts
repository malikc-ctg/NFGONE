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
    const { data: contractor, error: dbError } = await serviceClient
      .from('contractors')
      .select('*, zone:zones!contractors_zone_id_fkey(*), selected_zones:contractor_zones(zone:zones(*))')
      .eq('profile_id', user.id)
      .single();



    if (dbError) {
      console.error('Database error fetching contractor:', dbError);
      return NextResponse.json({ error: `Contractor profile not found: ${dbError.message}` }, { status: 404 });
    }

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found (empty result)' }, { status: 404 });
    }

    // Flatten selected_zones for easier frontend use
    const formattedContractor = {
      ...contractor,
      selected_zone_ids: contractor.selected_zones?.map((sz: any) => sz.zone.id) || []
    };

    return NextResponse.json(formattedContractor);
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
    const { full_name, phone, zone_ids, max_radius } = body;

    // Use service client to bypass RLS recursion issues
    const serviceClient = await createServiceClient();

    // First fetch current contractor to get notes
    const { data: currentContractor, error: fetchError } = await serviceClient
      .from('contractors')
      .select('id, notes')
      .eq('profile_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const existingNotes = currentContractor.notes ? JSON.parse(currentContractor.notes) : {};
    if (max_radius !== undefined) {
      existingNotes.max_radius = max_radius;
    }

    // 1. Update basic contractor info and notes
    const { data: contractor, error: contractorError } = await serviceClient
      .from('contractors')
      .update({
        full_name,
        phone,
        notes: JSON.stringify(existingNotes),
        updated_at: new Date().toISOString()
      })
      .eq('profile_id', user.id)
      .select()
      .single();

    if (contractorError) throw contractorError;

    // 2. Sync zones if provided
    if (Array.isArray(zone_ids)) {
      // Clear existing
      await serviceClient
        .from('contractor_zones')
        .delete()
        .eq('contractor_id', contractor.id);

      // Insert new
      if (zone_ids.length > 0) {
        const zoneInserts = zone_ids.map(id => ({
          contractor_id: contractor.id,
          zone_id: id
        }));
        const { error: syncError } = await serviceClient
          .from('contractor_zones')
          .insert(zoneInserts);
        
        if (syncError) throw syncError;
      }
    }


    return NextResponse.json(contractor);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}


