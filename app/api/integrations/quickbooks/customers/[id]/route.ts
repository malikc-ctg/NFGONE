import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api-auth';
import { getCustomerBalance } from '@/lib/quickbooks/reports';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    await requireRole(['admin']);

    const balance = await getCustomerBalance(params.id);

    return NextResponse.json({ data: { id: params.id, balance } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
