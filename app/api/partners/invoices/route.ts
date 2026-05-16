import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyInvoices } from '@/lib/partner-invoicing';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json({ error: 'year and month required' }, { status: 400 });
    }

    const result = await generateMonthlyInvoices(year, month);
    return NextResponse.json(result);
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
    const partner_id = searchParams.get('partner_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('partner_invoices')
      .select('*, partner:partners(company_name)')
      .order('created_at', { ascending: false });

    if (partner_id) query = query.eq('partner_id', partner_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
