'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job, JobStatus } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';

const STATUS_FILTERS: { label: string; statuses: JobStatus[] | null }[] = [
  { label: 'All', statuses: null },
  { label: 'Needs Dispatch', statuses: ['confirmed'] },
  { label: 'In Progress', statuses: ['assigned', 'on_the_way', 'in_progress'] },
  { label: 'Completed', statuses: ['completed', 'reviewed', 'paid_out'] },
  { label: 'Disputed', statuses: ['disputed'] },
  { label: 'Cancelled', statuses: ['cancelled', 'rescheduled', 'no_show'] },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(0);

  useEffect(() => {
    async function fetchJobs() {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    fetchJobs();
  }, []);

  const filter = STATUS_FILTERS[activeFilter];
  const filtered = filter.statuses
    ? jobs.filter((j) => filter.statuses!.includes(j.status))
    : jobs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">{filtered.length} jobs</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f, i) => (
          <Button
            key={f.label}
            variant={activeFilter === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(i)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quoted</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No jobs found</TableCell></TableRow>
              ) : (
                filtered.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">{job.job_number}</TableCell>
                    <TableCell className="text-xs">{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-xs">{TIME_WINDOW_LABELS[job.scheduled_window]}</TableCell>
                    <TableCell className="text-sm">{(job as any).customer?.full_name ?? '—'}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{job.address_line1}, {job.city}</TableCell>
                    <TableCell className="text-xs">{SERVICE_TYPE_LABELS[job.service_type]}</TableCell>
                    <TableCell><StatusBadge status={job.status} /></TableCell>
                    <TableCell className="text-xs font-medium">${job.quoted_price}</TableCell>
                    <TableCell className="text-xs">{(job as any).contractor?.full_name ?? '—'}</TableCell>
                    <TableCell>
                      <Link href={`/admin/jobs/${job.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
