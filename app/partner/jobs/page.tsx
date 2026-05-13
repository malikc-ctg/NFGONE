'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface PartnerJob {
  id: string; job_number: string; scheduled_date: string;
  address_line1: string; city: string; service_type: string;
  status: string; final_price: number | null; quoted_price: number;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  on_the_way: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function PartnerJobsPage() {
  const [jobs, setJobs] = useState<PartnerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    // TODO: get partner_id from session
    fetch('/api/partners/me/jobs').then(r => r.json()).then((d) => { setJobs(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = statusFilter ? jobs.filter(j => j.status === statusFilter) : jobs;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Jobs</h1>

      <div className="flex gap-2">
        {['', 'confirmed', 'in_progress', 'completed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
              statusFilter === s ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading jobs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No jobs found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Address</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Service</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-6 py-3.5 text-muted-foreground text-xs">{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-foreground">{job.address_line1}</p>
                    <p className="text-xs text-muted-foreground">{job.city}</p>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground capitalize text-xs">{job.service_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[job.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium">${(job.final_price ?? job.quoted_price).toFixed(2)}</td>
                  <td className="px-4 py-3.5">
                    <Link href={`/tracking/${job.id}`} className="text-primary text-xs flex items-center gap-0.5 hover:underline">
                      Track <ExternalLink className="h-3 w-3" />
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
