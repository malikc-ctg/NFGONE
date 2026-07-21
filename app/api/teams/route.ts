import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();
    const { name, lead_employee_id, zone_id, max_jobs_per_day, payout_split, notes } = body;

    if (!name || !lead_employee_id || !zone_id) {
      return NextResponse.json({ error: 'name, lead_employee_id, zone_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employee_teams')
      .insert({
        name, lead_employee_id, zone_id,
        max_jobs_per_day: max_jobs_per_day ?? 3,
        payout_split: payout_split ?? { lead: 0.45, member: 0.25 },
        notes: notes ?? null,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-add lead employee as 'lead' member
    await supabase.from('employee_team_members').insert({
      team_id: data.id,
      employee_id: lead_employee_id,
      role: 'lead',
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const zone_id = searchParams.get('zone_id');

    let query = supabase
      .from('employee_teams')
      .select(`
        *,
        zone:zones(name),
        lead_employee:employees!employee_teams_lead_employee_id_fkey(id, full_name, score),
        members:employee_team_members(*, employee:employees(id, full_name, score))
      `)
      .order('name');

    if (zone_id) query = query.eq('zone_id', zone_id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
