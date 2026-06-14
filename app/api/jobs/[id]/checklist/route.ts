import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Get the contractor ID for this user
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Verify the job belongs to this contractor
    const { data: job } = await supabase
      .from('jobs')
      .select('assigned_contractor_id')
      .eq('id', params.id)
      .single();

    if (!job || job.assigned_contractor_id !== contractor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceClient = await createServiceClient();

    // Insert checklist data
    const { data, error } = await serviceClient
      .from('job_checklists')
      .insert({
        job_id: params.id,
        contractor_id: contractor.id,
        checklist_data: body,
      })
      .select()
      .single();

    if (error) {
      console.error('Checklist insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, checklist: data });
  } catch (err: unknown) {
    console.error('POST /api/jobs/[id]/checklist error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
