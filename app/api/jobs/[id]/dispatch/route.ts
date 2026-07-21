import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { getSmartDispatchSuggestions } from '@/lib/smart-dispatch';

/**
 * GET /api/jobs/[id]/dispatch — Smart dispatch suggestions
 * Returns a ranked list of employees with drive times.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { id } = params;

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*, customer:customers(full_name)')
      .eq('id', id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const suggestions = await getSmartDispatchSuggestions(job);
    return NextResponse.json({ suggestions, job_id: id });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/jobs/[id]/dispatch — Dispatch offers to employees
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { id } = params;
    const { employee_ids, drive_times } = await request.json();

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json({ error: 'employee_ids required' }, { status: 400 });
    }

    if (employee_ids.length > 5) {
      return NextResponse.json({ error: 'Max 5 employees per dispatch' }, { status: 400 });
    }

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Create offers with drive time data
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    const offers = employee_ids.map((cid: string, idx: number) => ({
      job_id: id,
      employee_id: cid,
      status: 'pending',
      expires_at: expiresAt,
      estimated_drive_minutes: drive_times?.[idx] ?? null,
      dispatch_reason: 'smart_dispatch',
    }));

    const { data: createdOffers, error: offerError } = await supabase
      .from('job_offers')
      .insert(offers)
      .select();

    if (offerError) throw offerError;

    // Update job status to offered
    await supabase
      .from('jobs')
      .update({ status: 'offered', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Audit log
    logAudit({
      actorId: auth.id,
      actorEmail: auth.email,
      actorRole: 'admin',
      action: 'job.dispatched',
      entityType: 'job',
      entityId: id,
      oldValues: { status: job.status },
      newValues: { status: 'offered', employee_ids },
      request,
      metadata: { offer_count: employee_ids.length },
    });

    return NextResponse.json({ offers: createdOffers });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
