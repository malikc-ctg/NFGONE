import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api-auth';
import { getInvoiceById } from '@/lib/quickbooks/reports';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    await requireRole(['admin']);

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    const ids = idsParam.split(',').filter(Boolean);
    const results = await Promise.all(
      ids.map(async (id) => {
        const inv = await getInvoiceById(id.trim());
        return {
          Id: id.trim(),
          id: id.trim(),
          status: inv ? 'Found' : 'Not Found',
          Balance: Number(inv?.Balance || 0),
          TotalAmt: Number(inv?.TotalAmt || 0),
          DueDate: inv?.DueDate || null,
          DocNumber: inv?.DocNumber || null,
        };
      })
    );

    return NextResponse.json({ invoices: results, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
