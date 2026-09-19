import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { createQuickBooksInvoice, sendInvoicePaymentReminder } from '@/lib/quickbooks/invoicing';
import { getRecentInvoices } from '@/lib/quickbooks/reports';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const invoices = await getRecentInvoices(50);
    const today = new Date().toISOString().split('T')[0];

    // Compute dunning stages
    const dunningList = invoices.map((inv) => {
      let dunningStage: 'current' | 'due_soon' | 'grace_period' | 'urgent' | 'freeze_warning' = 'current';
      let daysLate = 0;

      if (inv.dueDate) {
        const due = new Date(inv.dueDate);
        const now = new Date(today);
        const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        daysLate = Math.max(0, diffDays);

        if (inv.status === 'paid') {
          dunningStage = 'current';
        } else if (diffDays > 14) {
          dunningStage = 'freeze_warning';
        } else if (diffDays > 7) {
          dunningStage = 'urgent';
        } else if (diffDays > 0) {
          dunningStage = 'grace_period';
        } else if (diffDays >= -3) {
          dunningStage = 'due_soon';
        }
      }

      return {
        ...inv,
        daysLate,
        dunningStage,
      };
    });

    const overdueCount = dunningList.filter(i => i.status === 'overdue').length;
    const totalOutstanding = dunningList.reduce((sum, i) => sum + (i.balance || 0), 0);

    return NextResponse.json({
      invoices: dunningList,
      overdueCount,
      totalOutstanding,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { customerName, customerEmail, customerPhone, address, city, postalCode, dueDate, items, memo } = body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Customer name and at least one item are required.' }, { status: 400 });
    }

    const result = await createQuickBooksInvoice({
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      postalCode,
      dueDate,
      memo,
      items,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { invoiceId, email } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
    }

    const result = await sendInvoicePaymentReminder(invoiceId, email);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Payment reminder dispatched successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
