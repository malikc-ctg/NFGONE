import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

// PATCH /api/contractors/[id]/verify-insurance
// body: { action: 'verify' | 'reject', admin_notes?: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
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
      .select('notes, insurance_on_file')
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
        insurance_details: {
          ...(existingNotes.insurance_details as Record<string, unknown> ?? {}),
          status: 'verified',
          verified_at: new Date().toISOString(),
          admin_notes: admin_notes ?? null,
        },
      };

      const { error } = await supabase
        .from('contractors')
        .update({
          insurance_on_file: true,
          notes: JSON.stringify(updatedNotes),
        })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, status: 'verified' });
    }

    // action === 'reject'
    const updatedNotes = {
      ...existingNotes,
      insurance_details: {
        ...(existingNotes.insurance_details as Record<string, unknown> ?? {}),
        status: 'rejected',
        file_url: null,
        rejected_at: new Date().toISOString(),
        rejection_reason: admin_notes ?? 'Document rejected by admin',
      },
    };

    const { error } = await supabase
      .from('contractors')
      .update({
        insurance_on_file: false,
        notes: JSON.stringify(updatedNotes),
      })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, status: 'rejected' });
  } catch (err: unknown) {
    console.error('PATCH /api/contractors/[id]/verify-insurance error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
