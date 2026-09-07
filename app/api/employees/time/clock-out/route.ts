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

    let { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!employee && user.email) {
      const { data: empByEmail } = await supabase
        .from('employees')
        .select('id')
        .ilike('email', user.email)
        .maybeSingle();
      if (empByEmail) {
        employee = empByEmail;
      }
    }

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
    
    // Calculate total elapsed minutes
    const diffMs = clockOutTime.getTime() - clockInTime.getTime();
    let totalMinutes = Math.floor(diffMs / (1000 * 60));

    // Deduct any break minutes recorded
    const metadata = openSheet.location_data && typeof openSheet.location_data === 'object'
      ? { ...openSheet.location_data }
      : {};
    if (Array.isArray(metadata.breaks)) {
      // If there was an open break, close it now
      metadata.breaks = metadata.breaks.map((b: any) => {
        if (!b.end) {
          const endStr = clockOutTime.toISOString();
          const startMs = new Date(b.start).getTime();
          const endMs = clockOutTime.getTime();
          return {
            ...b,
            end: endStr,
            duration_minutes: Math.max(0, Math.floor((endMs - startMs) / 60000)),
          };
        }
        return b;
      });

      const totalBreakMinutes = metadata.breaks.reduce((sum: number, b: any) => sum + (b.duration_minutes || 0), 0);
      totalMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
    }

    const { data, error } = await supabase
      .from('employee_timesheets')
      .update({
        clock_out_time: clockOutTime.toISOString(),
        total_minutes: totalMinutes,
        location_data: metadata,
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
