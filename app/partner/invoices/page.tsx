'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import type { PartnerInvoice } from '@/types';
import { format } from 'date-fns';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function PartnerInvoicesPage() {
  const [invoices, setInvoices] = useState<PartnerInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partners/invoices?partner_id=me').then(r => r.json()).then((d) => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Invoices</h1>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No invoices yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Period</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Subtotal</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Credits</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Total Due</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Due Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-6 py-3.5 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3.5 text-right">${inv.subtotal.toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-right text-green-600">
                    {inv.credits_applied > 0 ? `-$${inv.credits_applied.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold">${inv.total_due.toFixed(2)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <button className="text-primary text-xs flex items-center gap-0.5 hover:underline">
                      <Download className="h-3 w-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
