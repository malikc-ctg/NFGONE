'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Send, MapPin, DollarSign,
  User, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS, JOB_STATUS_LABELS } from '@/types';
import { getValidNextStatuses } from '@/lib/job-state-machine';
import type { Job, Contractor, JobStatus } from '@/types';
import Link from 'next/link';

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [availableContractors, setAvailableContractors] = useState<Contractor[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [dispatching, setDispatching] = useState(false);

  async function fetchJob() {
    try {
      const res = await fetch(`/api/jobs/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch job');
      const data = await res.json();
      setJob(data);
    } catch (err) {
      console.error('Error loading job:', err);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchJob(); }, [params.id]);

  async function handleStatusChange(newStatus: JobStatus) {
    try {
      const res = await fetch(`/api/jobs/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(`Status updated to ${JOB_STATUS_LABELS[newStatus]}`);
      fetchJob();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function openDispatch() {
    if (!job) return;
    setDispatchOpen(true);
    try {
      const res = await fetch(
        `/api/contractors/available?date=${job.scheduled_date}&window=${job.scheduled_window}${job.zone_id ? `&zone_id=${job.zone_id}` : ''}`
      );
      const data = await res.json();
      setAvailableContractors(Array.isArray(data) ? data : []);
    } catch {
      setAvailableContractors([]);
    }
  }

  async function handleDispatch() {
    if (selectedContractors.length === 0) {
      toast.error('Select at least one contractor');
      return;
    }
    setDispatching(true);
    try {
      // First ensure status is right for dispatch
      if (job?.status === 'confirmed' || job?.status === 'rescheduled') {
        const res = await fetch(`/api/jobs/${params.id}/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractor_ids: selectedContractors }),
        });
        if (!res.ok) throw new Error('Dispatch failed');
        toast.success('Offers sent to contractors');
        setDispatchOpen(false);
        setSelectedContractors([]);
        fetchJob();
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setDispatching(false);
    }
  }

  if (loading) return <p className="text-muted-foreground p-8">Loading...</p>;
  if (!job) return <p className="text-red-500 p-8">Job not found</p>;

  const nextStatuses = getValidNextStatuses(job.status);
  const customer = (job as any).customer;
  const contractor = (job as any).contractor;
  const payoutAmount = job.quoted_price * 0.7;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/jobs"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{job.job_number}</h1>
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex gap-3 flex-wrap">
        {nextStatuses.map((ns) => (
          <Button
            key={ns}
            variant={ns === 'cancelled' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange(ns)}
          >
            → {JOB_STATUS_LABELS[ns]}
          </Button>
        ))}
        {(job.status === 'confirmed' || job.status === 'rescheduled') && (
          <Button onClick={openDispatch} size="sm">
            <Send className="h-4 w-4 mr-2" />Dispatch
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Summary */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Job Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{SERVICE_TYPE_LABELS[job.service_type]}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Window</span><span>{TIME_WINDOW_LABELS[job.scheduled_window]}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{job.address_line1}, {job.city} {job.postal_code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bedrooms</span><span>{job.home_bedrooms ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bathrooms</span><span>{job.home_bathrooms ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pets</span><span>{job.has_pets ? 'Yes' : 'No'}</span></div>
            {job.access_instructions && (
              <div><span className="text-muted-foreground block mb-1">Access Instructions</span><span className="text-xs bg-muted p-2 rounded block">{job.access_instructions}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Financials</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Quoted Price</span><span className="font-bold">${job.quoted_price}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Final Price</span><span>${job.final_price ?? job.quoted_price}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span>${job.deposit_amount ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Deposit Paid</span><span>{job.deposit_paid_at ? format(new Date(job.deposit_paid_at), 'MMM d, yyyy') : 'No'}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Contractor Payout (70%)</span><span className="font-bold">${payoutAmount.toFixed(2)}</span></div>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><Link href={`/admin/customers/${customer.id}`} className="text-primary hover:underline">{customer.full_name}</Link></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{customer.phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{customer.email}</span></div>
              </>
            ) : <p className="text-muted-foreground">No customer data</p>}
          </CardContent>
        </Card>

        {/* Contractor */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" />Contractor</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contractor ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><Link href={`/admin/contractors/${contractor.id}`} className="text-primary hover:underline">{contractor.full_name}</Link></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{contractor.phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span>{contractor.score}/5.00</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tier</span><span className="capitalize">{contractor.tier}</span></div>
              </>
            ) : <p className="text-muted-foreground">No contractor assigned</p>}
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Modal */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dispatch Job {job.job_number}</DialogTitle>
            <DialogDescription>
              Select up to 5 contractors to send this job offer to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>{SERVICE_TYPE_LABELS[job.service_type]}</strong> — {format(new Date(job.scheduled_date), 'MMM d, yyyy')} {TIME_WINDOW_LABELS[job.scheduled_window]}</p>
              <p>{job.address_line1}, {job.city}</p>
              <p>Payout: <strong>${payoutAmount.toFixed(2)}</strong></p>
            </div>
            <Separator />
            <p className="text-sm font-medium">Available Contractors ({availableContractors.length})</p>
            {availableContractors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contractors available for this slot.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableContractors.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedContractors.includes(c.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedContractors((prev) =>
                        prev.includes(c.id)
                          ? prev.filter((id) => id !== c.id)
                          : prev.length < 5 ? [...prev, c.id] : prev
                      );
                    }}
                  >
                    <div>
                      <p className="font-medium text-sm">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {c.score}/5 · {c.brings_own_supplies ? 'Own supplies' : 'Needs supplies'} · {(c as any).zone?.name ?? 'No zone'}
                      </p>
                    </div>
                    <Checkbox checked={selectedContractors.includes(c.id)} />
                  </div>
                ))}
              </div>
            )}
            <Button onClick={handleDispatch} disabled={dispatching || selectedContractors.length === 0} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Send Offer{selectedContractors.length > 1 ? 's' : ''} ({selectedContractors.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
