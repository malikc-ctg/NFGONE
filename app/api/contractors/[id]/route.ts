import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/api-auth';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Admin-only action
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const { id } = params;
    const supabase = await createServiceClient();

    // 1. Get the contractor to find their profile_id
    const { data: contractor, error: fetchError } = await supabase
      .from('contractors')
      .select('profile_id, email')
      .eq('id', id)
      .single();

    if (fetchError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // 2. Safety check: block deletion if contractor has active/in-progress jobs
    const { count: activeJobCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_contractor_id', id)
      .in('status', ['confirmed', 'assigned', 'on_the_way', 'in_progress']);

    if (activeJobCount && activeJobCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete contractor with ${activeJobCount} active job(s). Complete or reassign them first.` },
        { status: 400 }
      );
    }

    // 3. Soft delete the contractor record instead of hard delete to preserve foreign key constraints
    const { error: deleteContractorError } = await supabase
      .from('contractors')
      .update({ 
        status: 'deleted',
        email: `deleted_${Date.now()}_${contractor.email}`
      })
      .eq('id', id);

    if (deleteContractorError) {
      throw deleteContractorError;
    }

    // 4. Completely delete the user from Auth (this cascades to profiles)
    // Only do this if they actually have an auth account attached
    if (contractor.profile_id) {
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(contractor.profile_id);
      if (deleteAuthError) {
        console.error('Failed to delete auth user, but contractor record was removed:', deleteAuthError);
        // We still return success because the contractor profile is gone
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting contractor:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const { id } = params;
    const body = await request.json();
    
    const supabase = await createServiceClient();
    
    const { data, error } = await supabase
      .from('contractors')
      .update(body)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error updating contractor:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

