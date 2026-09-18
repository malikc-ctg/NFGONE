// QuickBooks Online Entity Synchronization
// Handles automated syncing of customers, partner invoices, and job sales into QuickBooks Online.

import { createServiceClient } from '@/lib/supabase/server';
import { qboFetch, getValidConnection } from './client';
import type {
  QuickBooksCustomerPayload,
  QuickBooksInvoicePayload,
  QuickBooksLineItem,
  QuickBooksSyncLog,
  QuickBooksSyncResult,
} from './types';

/**
 * Records an entry in quickbooks_sync_logs
 */
export async function recordSyncLog(
  entityType: 'partner_invoice' | 'job' | 'customer' | 'connection_test',
  entityId: string | null,
  status: 'success' | 'failed' | 'pending',
  qboId?: string | null,
  errorMessage?: string | null,
  intuitTid?: string | null
): Promise<void> {
  try {
    const supabase = await createServiceClient();
    await supabase.from('quickbooks_sync_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      qbo_id: qboId || null,
      status,
      error_message: errorMessage || null,
      intuit_tid: intuitTid || null,
    });
  } catch (err) {
    console.error('[QuickBooks] Failed to write sync log:', err);
  }
}

/**
 * Finds an existing customer in QuickBooks by DisplayName or creates a new one.
 */
export async function findOrCreateQboCustomer(customer: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}): Promise<{ qboCustomerId: string | null; error?: string }> {
  // Sanitize display name for QBO query (escape single quotes)
  const cleanName = customer.name.replace(/'/g, "\\'");
  const query = `select * from Customer where DisplayName = '${cleanName}'`;

  const searchRes = await qboFetch<{ QueryResponse?: { Customer?: Array<{ Id: string }> } }>(
    `/query?query=${encodeURIComponent(query)}`
  );

  if (searchRes.data?.QueryResponse?.Customer?.[0]?.Id) {
    return { qboCustomerId: searchRes.data.QueryResponse.Customer[0].Id };
  }

  // Customer not found, create new Customer in QBO
  const payload: QuickBooksCustomerPayload = {
    DisplayName: customer.name.slice(0, 100),
    PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
    PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
    BillAddr: customer.address
      ? {
          Line1: customer.address,
          City: customer.city || 'Toronto',
          CountrySubDivisionCode: 'ON',
          PostalCode: customer.postalCode,
          Country: 'Canada',
        }
      : undefined,
  };

  const createRes = await qboFetch<{ Customer: { Id: string } }>('/customer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (createRes.error || !createRes.data?.Customer?.Id) {
    return {
      qboCustomerId: null,
      error: createRes.error || 'Failed to create customer in QuickBooks.',
    };
  }

  return { qboCustomerId: createRes.data.Customer.Id };
}

/**
 * Syncs a Partner Invoice to QuickBooks Online as an Accounts Receivable Invoice
 */
export async function syncPartnerInvoiceToQBO(partnerInvoiceId: string): Promise<QuickBooksSyncResult> {
  const supabase = await createServiceClient();

  // Fetch invoice details with partner info
  const { data: invoice, error: invoiceError } = await supabase
    .from('partner_invoices')
    .select('*, partner:partners(id, company_name, billing_email, qbo_customer_id)')
    .eq('id', partnerInvoiceId)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: 'Invoice not found in database.' };
  }

  const partner = invoice.partner as {
    id: string;
    company_name: string;
    billing_email?: string;
    qbo_customer_id?: string;
  } | null;

  if (!partner) {
    return { success: false, error: 'Associated partner not found.' };
  }

  // 1. Ensure Partner has a QBO Customer record
  let qboCustomerId = partner.qbo_customer_id;
  if (!qboCustomerId) {
    const customerResult = await findOrCreateQboCustomer({
      name: partner.company_name,
      email: partner.billing_email,
    });

    if (!customerResult.qboCustomerId) {
      await recordSyncLog('partner_invoice', partnerInvoiceId, 'failed', null, customerResult.error);
      return { success: false, error: customerResult.error };
    }

    qboCustomerId = customerResult.qboCustomerId;

    // Update partner with QBO Customer ID
    await supabase.from('partners').update({ qbo_customer_id: qboCustomerId }).eq('id', partner.id);
  }

  // 2. Build Invoice Line Items
  const rawLineItems = (invoice.line_items as any[]) || [];
  const lines: QuickBooksLineItem[] = rawLineItems.map((item) => ({
    DetailType: 'SalesItemLineDetail',
    Amount: Number(item.price || 0),
    Description: `${item.service_type || 'Cleaning'} - ${item.address || ''} (${item.date || ''})`,
    SalesItemLineDetail: {
      UnitPrice: Number(item.price || 0),
      Qty: 1,
    },
  }));

  // Fallback if no line items
  if (lines.length === 0) {
    lines.push({
      DetailType: 'SalesItemLineDetail',
      Amount: Number(invoice.total_due || invoice.subtotal || 0),
      Description: `Partner Services (${invoice.period_start} to ${invoice.period_end})`,
      SalesItemLineDetail: {
        UnitPrice: Number(invoice.total_due || invoice.subtotal || 0),
        Qty: 1,
      },
    });
  }

  // 3. Build QBO Invoice Payload
  const payload: QuickBooksInvoicePayload = {
    DocNumber: invoice.invoice_number,
    TxnDate: invoice.period_end || new Date().toISOString().split('T')[0],
    DueDate: invoice.due_date || undefined,
    CustomerRef: {
      value: qboCustomerId,
      name: partner.company_name,
    },
    Line: lines,
    BillEmail: partner.billing_email ? { Address: partner.billing_email } : undefined,
    CustomerMemo: {
      value: `Sea of Blue Partner Invoice ${invoice.invoice_number}`,
    },
    AllowOnlineCreditCardPayment: true,
    AllowOnlineACHPayment: true,
  };

  // 4. Send to QuickBooks
  const res = await qboFetch<{ Invoice: { Id: string; DocNumber?: string } }>('/invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.error || !res.data?.Invoice?.Id) {
    await recordSyncLog('partner_invoice', partnerInvoiceId, 'failed', null, res.error, res.intuitTid);
    return {
      success: false,
      error: res.error || 'Failed to create invoice in QuickBooks.',
      intuitTid: res.intuitTid,
    };
  }

  const qboInvoiceId = res.data.Invoice.Id;

  // 5. Update local record with QBO ID
  await supabase
    .from('partner_invoices')
    .update({ qbo_invoice_id: qboInvoiceId })
    .eq('id', partnerInvoiceId);

  // Update last sync time on active connection
  const connection = await getValidConnection();
  if (connection) {
    await supabase
      .from('quickbooks_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);
  }

  await recordSyncLog('partner_invoice', partnerInvoiceId, 'success', qboInvoiceId, null, res.intuitTid);

  return {
    success: true,
    qboId: qboInvoiceId,
    docNumber: res.data.Invoice.DocNumber || invoice.invoice_number,
    intuitTid: res.intuitTid,
  };
}

/**
 * Syncs a completed Job to QuickBooks Online
 */
export async function syncJobToQBO(jobId: string): Promise<QuickBooksSyncResult> {
  const supabase = await createServiceClient();

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*, customer:customers(id, full_name, email, phone, qbo_customer_id)')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return { success: false, error: 'Job not found.' };
  }

  const customer = job.customer as {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    qbo_customer_id?: string;
  } | null;

  const customerName = customer?.full_name || job.customer_name || 'Walk-in Client';

  // 1. Ensure Customer exists in QBO
  let qboCustomerId = customer?.qbo_customer_id;
  if (!qboCustomerId) {
    const custRes = await findOrCreateQboCustomer({
      name: customerName,
      email: customer?.email || job.customer_email,
      phone: customer?.phone || job.customer_phone,
      address: job.address_line1,
      city: job.city,
      postalCode: job.postal_code,
    });

    if (!custRes.qboCustomerId) {
      await recordSyncLog('job', jobId, 'failed', null, custRes.error);
      return { success: false, error: custRes.error };
    }

    qboCustomerId = custRes.qboCustomerId;
    if (customer?.id) {
      await supabase.from('customers').update({ qbo_customer_id: qboCustomerId }).eq('id', customer.id);
    }
  }

  // 2. Build Invoice
  const price = Number(job.final_price || job.estimated_price || 0);
  const payload: QuickBooksInvoicePayload = {
    DocNumber: job.job_number || undefined,
    TxnDate: job.scheduled_date || new Date().toISOString().split('T')[0],
    CustomerRef: {
      value: qboCustomerId,
      name: customerName,
    },
    Line: [
      {
        DetailType: 'SalesItemLineDetail',
        Amount: price,
        Description: `${job.service_type || 'Cleaning Service'} — ${job.address_line1 || ''}, ${job.city || ''}`,
        SalesItemLineDetail: {
          UnitPrice: price,
          Qty: 1,
        },
      },
    ],
    CustomerMemo: {
      value: `Sea of Blue Cleaning Job #${job.job_number || jobId.slice(0, 8)}`,
    },
    AllowOnlineCreditCardPayment: true,
    AllowOnlineACHPayment: true,
  };

  const res = await qboFetch<{ Invoice: { Id: string; DocNumber?: string } }>('/invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.error || !res.data?.Invoice?.Id) {
    await recordSyncLog('job', jobId, 'failed', null, res.error, res.intuitTid);
    return { success: false, error: res.error || 'Failed to sync job to QuickBooks.' };
  }

  const qboInvoiceId = res.data.Invoice.Id;
  await supabase.from('jobs').update({ qbo_invoice_id: qboInvoiceId }).eq('id', jobId);

  await recordSyncLog('job', jobId, 'success', qboInvoiceId, null, res.intuitTid);

  return { success: true, qboId: qboInvoiceId, docNumber: res.data.Invoice.DocNumber };
}

/**
 * Tests QuickBooks connectivity by querying CompanyInfo
 */
export async function testQuickBooksConnection(): Promise<{
  success: boolean;
  companyName?: string;
  error?: string;
  intuitTid?: string;
}> {
  const connection = await getValidConnection();
  if (!connection) {
    return { success: false, error: 'No active QuickBooks connection found.' };
  }

  const res = await qboFetch<{ CompanyInfo?: { CompanyName?: string; LegalName?: string } }>(
    `/companyinfo/${connection.realm_id}`
  );

  if (res.error || !res.data?.CompanyInfo) {
    await recordSyncLog('connection_test', null, 'failed', null, res.error, res.intuitTid);
    return { success: false, error: res.error || 'Could not fetch company info.', intuitTid: res.intuitTid };
  }

  const companyName =
    res.data.CompanyInfo.CompanyName || res.data.CompanyInfo.LegalName || 'Connected Company';

  await recordSyncLog('connection_test', null, 'success', connection.realm_id, null, res.intuitTid);

  return { success: true, companyName, intuitTid: res.intuitTid };
}

/**
 * Fetches recent sync logs for admin dashboard
 */
export async function getRecentSyncLogs(limit = 10): Promise<QuickBooksSyncLog[]> {
  try {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from('quickbooks_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data as QuickBooksSyncLog[]) || [];
  } catch {
    return [];
  }
}
