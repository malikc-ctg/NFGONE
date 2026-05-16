import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createDispute } from '@/lib/dispute-engine';
import type { DisputeCategory } from '@/types';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { job_id, customer_id, contractor_id, category, description, evidence_urls } = body;

    if (!job_id || !customer_id || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify job is within 72h of completion
    const supabase = await createServiceClient();
    const { data: job } = await supabase
      .from('jobs')
      .select('contractor_completed_at, status')
      .eq('id', job_id)
      .single();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const validStatuses = ['completed', 'reviewed'];
    if (!validStatuses.includes(job.status)) {
      return NextResponse.json({ error: 'Job is not eligible for dispute' }, { status: 400 });
    }

    if (job.contractor_completed_at) {
      const completedAt = new Date(job.contractor_completed_at);
      const hoursElapsed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > 72) {
        return NextResponse.json({ error: 'Dispute window has closed (72h after completion)' }, { status: 400 });
      }
    }

    const result = await createDispute({
      job_id, customer_id, contractor_id: contractor_id ?? null,
      category: category as DisputeCategory,
      description, evidence_urls: evidence_urls ?? [],
    });

    if (!result) return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('disputes')
      .select('*, job:jobs(job_number, scheduled_date, service_type), customer:customers(full_name, email), contractor:contractors(full_name)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
