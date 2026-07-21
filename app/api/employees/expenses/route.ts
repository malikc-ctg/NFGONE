import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

// Helper to get employee ID for current user
async function getEmployeeId(userId: string, serviceClient: any) {
  const { data: employee } = await serviceClient
    .from('employees')
    .select('id')
    .eq('profile_id', userId)
    .single();
  return employee?.id;
}

export async function GET() {
  try {
    // Auth check
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    const employeeId = await getEmployeeId(user.id, serviceClient);

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const { data: expenses, error } = await serviceClient
      .from('employee_expenses')
      .select('*')
      .eq('employee_id', employeeId)
      .order('expense_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(expenses || []);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    const employeeId = await getEmployeeId(user.id, serviceClient);

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { expense_date, category, amount, description } = body;

    const { data: expense, error } = await serviceClient
      .from('employee_expenses')
      .insert({
        employee_id: employeeId,
        expense_date,
        category,
        amount: parseFloat(amount),
        description
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(expense, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    const employeeId = await getEmployeeId(user.id, serviceClient);

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('employee_expenses')
      .delete()
      .match({ id, employee_id: employeeId });

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
