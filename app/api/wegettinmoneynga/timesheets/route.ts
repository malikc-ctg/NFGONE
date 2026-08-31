import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const supabase = await createServiceClient();

    let query = supabase
      .from('employee_time_entries')
      .select('*, employee:employees(id, full_name, email, tier)')
      .order('clock_in', { ascending: false });

    if (employeeId) query = query.eq('employee_id', employeeId);
    if (startDate) query = query.gte('clock_in', startDate);
    if (endDate) query = query.lte('clock_in', endDate);

    const { data, error } = await query.limit(500);

    if (error) {
      console.error('Error fetching timesheets:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in timesheets route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
