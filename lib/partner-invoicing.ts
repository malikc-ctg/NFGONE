// Sea of Blue — Partner Invoicing
// Generates monthly consolidated invoices for partner accounts.

import { createServiceClient } from '@/lib/supabase/server';
import type { PartnerInvoiceLineItem } from '@/types';

function generateInvoiceNumber(partnerId: string): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const suffix = partnerId.slice(0, 4).toUpperCase();
  return `SOB-INV-${ym}-${suffix}`;
}

export async function generateMonthlyInvoices(
  year: number,
  month: number // 1-indexed
): Promise<{ generated: number; errors: string[] }> {
  const supabase = await createServiceClient();

  const periodStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];

  // Get all active partners
  const { data: partners } = await supabase
    .from('partners')
    .select('id, company_name, commission_rate, credit_balance, billing_email')
    .eq('is_active', true);

  if (!partners) return { generated: 0, errors: ['Could not fetch partners'] };

  let generated = 0;
  const errors: string[] = [];

  for (const partner of partners) {
    try {
      // Get all jobs booked by this partner in this period
      const { data: partnerBookings } = await supabase
        .from('partner_bookings')
        .select('*, job:jobs(id, job_number, scheduled_date, address_line1, city, service_type, final_price, status)')
        .eq('partner_id', partner.id)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd + 'T23:59:59Z');

      const completedBookings = (partnerBookings ?? []).filter(
        (pb) => ['completed', 'reviewed', 'paid_out'].includes((pb.job as { status: string }).status)
      );

      if (completedBookings.length === 0) continue;

      const lineItems: PartnerInvoiceLineItem[] = completedBookings.map((pb) => {
        const job = pb.job as {
          id: string; job_number: string; scheduled_date: string;
          address_line1: string; city: string; service_type: string; final_price: number;
        };
        return {
          job_id: job.id,
          job_number: job.job_number,
          date: job.scheduled_date,
          address: `${job.address_line1}, ${job.city}`,
          service_type: job.service_type as PartnerInvoiceLineItem['service_type'],
          price: job.final_price ?? 0,
        };
      });

      const subtotal = lineItems.reduce((sum, li) => sum + li.price, 0);
      const creditsApplied = Math.min(partner.credit_balance as number ?? 0, subtotal);
      const totalDue = Math.max(0, subtotal - creditsApplied);

      // Check if invoice already exists for this period
      const invoiceNumber = generateInvoiceNumber(partner.id);
      const { data: existing } = await supabase
        .from('partner_invoices')
        .select('id')
        .eq('partner_id', partner.id)
        .gte('period_start', periodStart)
        .lte('period_end', periodEnd)
        .single();

      if (existing) continue;

      const dueDate = new Date(year, month, 15).toISOString().split('T')[0]; // 15th of next month

      await supabase.from('partner_invoices').insert({
        partner_id: partner.id,
        invoice_number: invoiceNumber,
        period_start: periodStart,
        period_end: periodEnd,
        line_items: lineItems,
        subtotal,
        credits_applied: creditsApplied,
        total_due: totalDue,
        status: 'draft',
        due_date: dueDate,
      });

      generated++;
    } catch (err) {
      errors.push(`Partner ${partner.id}: ${(err as Error).message}`);
    }
  }

  return { generated, errors };
}

export async function getPartnerInvoices(partnerId: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('partner_invoices')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });
  return data ?? [];
}
