import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  // Clock Out
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Find the open timesheet
    const { data: openSheet } = await supabase
      .from('employee_timesheets')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('status', 'open')
      .single();

    if (!openSheet) {
      return NextResponse.json({ error: 'No active timesheet found to clock out of' }, { status: 400 });
    }

    const clockOutTime = new Date();
    const clockInTime = new Date(openSheet.clock_in_time);
    
    // Calculate total minutes
    const diffMs = clockOutTime.getTime() - clockInTime.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));

    const { data, error } = await supabase
      .from('employee_timesheets')
      .update({
        clock_out_time: clockOutTime.toISOString(),
        total_minutes: totalMinutes,
        status: 'completed'
      })
      .eq('id', openSheet.id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
