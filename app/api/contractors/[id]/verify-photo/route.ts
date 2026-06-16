import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

// PATCH /api/contractors/[id]/verify-photo
// body: { action: 'verify' | 'reject', admin_notes?: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const { action, admin_notes } = body;

    if (!action || !['verify', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "verify" or "reject"' }, { status: 400 });
    }

    // Fetch current contractor notes
    const { data: contractor, error: fetchError } = await supabase
      .from('contractors')
      .select('notes')
      .eq('id', id)
      .single();

    if (fetchError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    let existingNotes: Record<string, unknown> = {};
    try {
      existingNotes = contractor.notes ? JSON.parse(contractor.notes) : {};
    } catch {
      existingNotes = {};
    }

    if (action === 'verify') {
      const updatedNotes = {
        ...existingNotes,
        profile_photo_status: 'verified',
        profile_photo_verified_at: new Date().toISOString(),
        profile_photo_admin_notes: admin_notes ?? null,
      };

      const { error } = await supabase
        .from('contractors')
        .update({
          notes: JSON.stringify(updatedNotes),
        })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, status: 'verified' });
    }

    // action === 'reject'
    const updatedNotes = {
      ...existingNotes,
      profile_photo_status: 'rejected',
      profile_photo_url: null,
      profile_photo_rejected_at: new Date().toISOString(),
      profile_photo_rejection_reason: admin_notes ?? 'Photo rejected by admin',
    };

    const { error } = await supabase
      .from('contractors')
      .update({
        notes: JSON.stringify(updatedNotes),
      })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, status: 'rejected' });
  } catch (err: unknown) {
    console.error('PATCH /api/contractors/[id]/verify-photo error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
