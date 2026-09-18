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

    const ids = idsParam.split(',');
    const results = await Promise.all(
      ids.map(async (id) => {
        const inv = await getInvoiceById(id);
        return {
          id,
          status: inv ? 'Found' : 'Not Found',
          balance: inv?.Balance || 0,
          dueDate: inv?.DueDate || null
        };
      })
    );

    return NextResponse.json({ data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
