import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

// Helper to get contractor ID for current user
async function getContractorId(userId: string, serviceClient: any) {
  const { data: contractor } = await serviceClient
    .from('contractors')
    .select('id')
    .eq('profile_id', userId)
    .single();
  return contractor?.id;
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
    const contractorId = await getContractorId(user.id, serviceClient);

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { data: expenses, error } = await serviceClient
      .from('contractor_expenses')
      .select('*')
      .eq('contractor_id', contractorId)
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
    const contractorId = await getContractorId(user.id, serviceClient);

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { expense_date, category, amount, description } = body;

    const { data: expense, error } = await serviceClient
      .from('contractor_expenses')
      .insert({
        contractor_id: contractorId,
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
    const contractorId = await getContractorId(user.id, serviceClient);

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('contractor_expenses')
      .delete()
      .match({ id, contractor_id: contractorId });

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
