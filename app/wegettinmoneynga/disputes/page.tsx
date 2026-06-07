'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { Dispute } from '@/types';
import { format } from 'date-fns';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-amber-100 text-amber-700',
  resolved_customer: 'bg-green-100 text-green-700',
  resolved_company: 'bg-blue-100 text-blue-700',
  escalated: 'bg-purple-100 text-purple-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  missed_items: 'Missed Items',
  damage: 'Damage',
  no_show: 'No Show',
  billing: 'Billing',
  other: 'Other',
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = statusFilter ? `/api/disputes?status=${statusFilter}` : '/api/disputes';
    fetch(url).then(r => r.json()).then((d) => { setDisputes(Array.isArray(d) ? d : []); setLoading(false); });
  }, [statusFilter]);

  const openCount = disputes.filter(d => d.status === 'open').length;
  const reviewCount = disputes.filter(d => d.status === 'under_review').length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Customer complaints and resolution workflow</p>
        </div>
        <div className="flex items-center gap-3">
          {openCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 px-3 py-1.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              {openCount} open
            </span>
          )}
          {reviewCount > 0 && (
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
              {reviewCount} under review
            </span>
          )}
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2">
        {[
          { value: '', label: 'All' },
          { value: 'open', label: 'Open' },
          { value: 'under_review', label: 'Under Review' },
          { value: 'resolved_customer', label: 'Resolved (Customer)' },
          { value: 'resolved_company', label: 'Resolved (Company)' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setLoading(true); setStatusFilter(f.value); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading disputes…</div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No disputes {statusFilter && `with status "${statusFilter}"`}.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Job</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Refund</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Opened</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="font-medium text-foreground">{(d.customer as { full_name?: string } | undefined)?.full_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{(d.customer as { email?: string } | undefined)?.email}</div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{CATEGORY_LABELS[d.category] ?? d.category}</td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {(d.job as { job_number?: string } | undefined)?.job_number ?? '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[d.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {d.refund_amount ? `$${d.refund_amount.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">{format(new Date(d.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3.5">
                    <Link href={`/wegettinmoneynga/disputes/${d.id}`} className="text-primary hover:underline flex items-center gap-0.5 text-xs">
                      Review <ChevronRight className="h-3 w-3" />
                    </Link>
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
