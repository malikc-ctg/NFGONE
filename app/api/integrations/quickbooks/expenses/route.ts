import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api-auth';
import { getVendorExpenses } from '@/lib/quickbooks/reports';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    await requireRole(['admin']);

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';

    const expenses = await getVendorExpenses(startDate, endDate);

    return NextResponse.json({ data: expenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
