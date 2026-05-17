import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const supabase = await createServiceClient();

    // 1. Get the contractor to find their profile_id
    const { data: contractor, error: fetchError } = await supabase
      .from('contractors')
      .select('profile_id')
      .eq('id', id)
      .single();

    if (fetchError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // 2. Delete the contractor record from the contractors table first
    const { error: deleteContractorError } = await supabase
      .from('contractors')
      .delete()
      .eq('id', id);

    if (deleteContractorError) {
      throw deleteContractorError;
    }

    // 3. Completely delete the user from Auth (this cascades to profiles)
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
