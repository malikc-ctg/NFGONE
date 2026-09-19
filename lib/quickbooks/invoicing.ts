import { qboFetch } from './client';
import { findOrCreateQboCustomer } from './sync';
import type { QuickBooksInvoicePayload, QuickBooksLineItem } from './types';

export interface CreateInvoiceInput {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  dueDate?: string;
  memo?: string;
  items: Array<{
    description: string;
    amount: number;
    qty?: number;
    unitPrice?: number;
  }>;
}

export async function createQuickBooksInvoice(input: CreateInvoiceInput): Promise<{
  success: boolean;
  invoiceId?: string;
  docNumber?: string;
  totalAmt?: number;
  error?: string;
}> {
  try {
    // 1. Ensure customer exists in QuickBooks
    const custResult = await findOrCreateQboCustomer({
      name: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
      address: input.address,
      city: input.city,
      postalCode: input.postalCode,
    });

    if (!custResult.qboCustomerId) {
      return { success: false, error: custResult.error || 'Failed to create or locate customer in QuickBooks' };
    }

    // 2. Build line items
    const lines: QuickBooksLineItem[] = input.items.map((item) => {
      const qty = item.qty || 1;
      const unitPrice = item.unitPrice || item.amount / qty;
      return {
        DetailType: 'SalesItemLineDetail',
        Amount: Number(item.amount),
        Description: item.description,
        SalesItemLineDetail: {
          UnitPrice: unitPrice,
          Qty: qty,
        },
      };
    });

    const payload: QuickBooksInvoicePayload = {
      TxnDate: new Date().toISOString().split('T')[0],
      DueDate: input.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      CustomerRef: {
        value: custResult.qboCustomerId,
        name: input.customerName,
      },
      Line: lines,
      CustomerMemo: input.memo ? { value: input.memo } : { value: 'Sea of Blue Cleaning Services' },
      BillEmail: input.customerEmail ? { Address: input.customerEmail } : undefined,
      AllowOnlineCreditCardPayment: true,
      AllowOnlineACHPayment: true,
    };

    // 3. Post invoice to QuickBooks
    const { data, error } = await qboFetch<any>('/invoice', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (error || !data?.Invoice?.Id) {
      return { success: false, error: error || 'Failed to generate invoice in QuickBooks' };
    }

    const createdInv = data.Invoice;

    // Optional: Trigger email delivery via QuickBooks if email is present
    if (input.customerEmail && createdInv.Id) {
      try {
        await qboFetch(`/invoice/${createdInv.Id}/send?sendTo=${encodeURIComponent(input.customerEmail)}`, {
          method: 'POST',
        });
      } catch (err) {
        console.warn('[QuickBooks] Invoice created but failed to auto-send email:', err);
      }
    }

    return {
      success: true,
      invoiceId: createdInv.Id,
      docNumber: createdInv.DocNumber,
      totalAmt: Number(createdInv.TotalAmt || 0),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendInvoicePaymentReminder(invoiceId: string, email?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = email
      ? `/invoice/${invoiceId}/send?sendTo=${encodeURIComponent(email)}`
      : `/invoice/${invoiceId}/send`;
    const { error } = await qboFetch(url, { method: 'POST' });
    if (error) return { success: false, error };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
