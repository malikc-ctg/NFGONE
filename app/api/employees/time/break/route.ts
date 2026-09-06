import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  // Toggle or start/end break
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

    // Find the active open timesheet
    const { data: openSheet } = await supabase
      .from('employee_timesheets')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('status', 'open')
      .single();

    if (!openSheet) {
      return NextResponse.json({ error: 'No active shift to take a break from' }, { status: 400 });
    }

    // Parse location_data to read/write breaks safely
    const metadata = openSheet.location_data && typeof openSheet.location_data === 'object'
      ? { ...openSheet.location_data }
      : {};

    const breaks = Array.isArray(metadata.breaks) ? [...metadata.breaks] : [];
    const now = new Date().toISOString();

    // Check if there is an ongoing break
    const activeBreakIndex = breaks.findIndex((b: any) => !b.end);

    if (activeBreakIndex >= 0) {
      // End the current break
      breaks[activeBreakIndex].end = now;
      const startMs = new Date(breaks[activeBreakIndex].start).getTime();
      const endMs = new Date(now).getTime();
      breaks[activeBreakIndex].duration_minutes = Math.max(0, Math.floor((endMs - startMs) / 60000));
    } else {
      // Start a new break
      breaks.push({
        start: now,
        end: null,
      });
    }

    metadata.breaks = breaks;

    const { data, error } = await supabase
      .from('employee_timesheets')
      .update({
        location_data: metadata,
      })
      .eq('id', openSheet.id)
      .select('*')
      .single();

    if (error) throw error;

    const isOnBreak = breaks.some((b: any) => !b.end);

    return NextResponse.json({
      timesheet: data,
      isOnBreak,
      breaks,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
