import { createServiceClient, createClient } from '@/lib/supabase/server';
import { isValidTransition } from '@/lib/job-state-machine';
import { NextRequest, NextResponse } from 'next/server';
import type { JobStatus } from '@/types';
import { requireRole, requireAuth } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // Get user role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';

    const supabase = await createServiceClient();
    const { id } = params;
    const { status: newStatus, ...extraFields } = await request.json();

    // Get current job
    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Security Check: Only admin or the assigned contractor can update this job
    if (!isAdmin && job.assigned_contractor_id !== user?.id) {
      return NextResponse.json({ error: 'Unauthorized to update this job' }, { status: 403 });
    }

    // Validate transition
    if (!isValidTransition(job.status as JobStatus, newStatus as JobStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition: ${job.status} → ${newStatus}` },
        { status: 422 }
      );
    }

    // Build update object
    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Handle specific transitions
    if (newStatus === 'in_progress') {
      updateData.contractor_started_at = new Date().toISOString();
    }
    if (newStatus === 'completed') {
      updateData.contractor_completed_at = new Date().toISOString();
    }
    if (newStatus === 'cancelled' && extraFields.cancellation_reason) {
      updateData.cancellation_reason = extraFields.cancellation_reason;
    }
    if (newStatus === 'disputed' && extraFields.dispute_reason) {
      updateData.dispute_reason = extraFields.dispute_reason;
    }

    // Merge any additional allowed fields
    if (extraFields.final_price !== undefined) updateData.final_price = extraFields.final_price;
    if (extraFields.admin_notes !== undefined) updateData.admin_notes = extraFields.admin_notes;
    if (extraFields.assigned_contractor_id !== undefined) {
      updateData.assigned_contractor_id = extraFields.assigned_contractor_id;
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .select('*, customer:customers(*), contractor:contractors(*)')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
