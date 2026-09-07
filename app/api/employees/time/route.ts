import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // use service role to query safely
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the employee record
    let { data: employee, error: empError } = await supabase
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

    // Always check for an active open timesheet
    const { data: openTimesheet } = await supabase
      .from('employee_timesheets')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('status', 'open')
      .order('clock_in_time', { ascending: false })
      .maybeSingle();

    // Get URL params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // optional date filter
    
    let query = supabase
      .from('employee_timesheets')
      .select('*')
      .eq('employee_id', employee.id)
      .order('work_date', { ascending: false });

    if (date) {
      query = query.eq('work_date', date);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = data || [];
    // If there is an open timesheet and it's not already in results, prepend it
    if (openTimesheet && !results.some((t: any) => t.id === openTimesheet.id)) {
      results = [openTimesheet, ...results];
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Clock In
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

    // Check if there is already an open timesheet
    const { data: existing } = await supabase
      .from('employee_timesheets')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('status', 'open')
      .order('clock_in_time', { ascending: false })
      .maybeSingle();

    if (existing) {
      // Return the existing open timesheet gracefully
      return NextResponse.json(existing, { status: 200 });
    }

    const body = await request.json().catch(() => ({}));

    const { data, error } = await supabase
      .from('employee_timesheets')
      .insert({
        employee_id: employee.id,
        work_date: new Date().toISOString().split('T')[0],
        clock_in_time: new Date().toISOString(),
        location_data: body.location_data || null,
        status: 'open',
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
