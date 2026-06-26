'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Send, MapPin, DollarSign,
  User, Star, AlertTriangle, Pencil
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
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
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [availableContractors, setAvailableContractors] = useState<any[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/zones').then(r => r.json()).then(z => setZones(Array.isArray(z) ? z : []));
  }, []);

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
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/jobs/${params.id}/dispatch`);
      const data = await res.json();
      setAvailableContractors(data.suggestions || []);
    } catch {
      setAvailableContractors([]);
    } finally {
      setLoadingSuggestions(false);
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
        const driveTimes = selectedContractors.map(id => {
          const c = availableContractors.find(ac => ac.contractor_id === id);
          return c ? c.drive_minutes : null;
        });

        const res = await fetch(`/api/jobs/${params.id}/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractor_ids: selectedContractors, drive_times: driveTimes }),
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

  async function handleEditJob() {
    try {
      const res = await fetch(`/api/jobs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update job');
      toast.success('Job updated successfully');
      setEditOpen(false);
      fetchJob();
    } catch (err: any) {
      toast.error(err.message);
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
        <Link href="/wegettinmoneynga/jobs"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
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
        
        <Dialog modal={false} open={editOpen} onOpenChange={(open) => {
          if (open) setEditForm(job);
          setEditOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-2" /> Edit</Button>
          </DialogTrigger>
          <DialogContent 
            className="max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Edit Job</DialogTitle>
              <DialogDescription className="sr-only">
                Edit the job details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Service Type</Label>
                <Select value={editForm.service_type || ''} onValueChange={v => setEditForm({ ...editForm, service_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Scheduled Date</Label><DatePicker value={editForm.scheduled_date || ''} onChange={(val) => setEditForm({ ...editForm, scheduled_date: val })} /></div>
              <div>
                <Label>Window</Label>
                <Select value={editForm.scheduled_window || ''} onValueChange={v => setEditForm({ ...editForm, scheduled_window: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zone</Label>
                <Select value={editForm.zone_id || ''} onValueChange={(v) => setEditForm({ ...editForm, zone_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                  <SelectContent>
                    {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Address</Label><AddressAutocomplete value={editForm.address_line1 || ''} onChange={e => setEditForm({ ...editForm, address_line1: e.target.value })} onAddressSelect={addr => setEditForm(f => ({ ...f, address_line1: addr.address_line1, city: addr.city || f.city, postal_code: addr.postal_code || f.postal_code }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>City</Label><Input value={editForm.city || ''} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
                <div><Label>Postal Code</Label><Input value={editForm.postal_code || ''} onChange={e => setEditForm({ ...editForm, postal_code: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Bedrooms</Label><Input type="number" value={editForm.home_bedrooms || ''} onChange={e => setEditForm({ ...editForm, home_bedrooms: parseInt(e.target.value) || undefined })} /></div>
                <div><Label>Bathrooms</Label><Input type="number" value={editForm.home_bathrooms || ''} onChange={e => setEditForm({ ...editForm, home_bathrooms: parseInt(e.target.value) || undefined })} /></div>
              </div>
              <div><Label>Quoted Price ($)</Label><Input type="number" value={editForm.quoted_price || ''} onChange={e => setEditForm({ ...editForm, quoted_price: parseFloat(e.target.value) || 0 })} /></div>
              <Button onClick={handleEditJob} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Home Profile Alerts */}
      {customer && (() => {
        try {
          const p = JSON.parse(customer.notes || '{}');
          if (!p.has_pets && !p.entry_instructions) return null;
          return (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-orange-900">
                <p className="font-bold">Customer Home Profile Alerts</p>
                <ul className="list-disc pl-4 space-y-1">
                  {p.has_pets && (
                    <li><strong>Pets in home:</strong> Please be mindful of animals when opening doors.</li>
                  )}
                  {p.entry_instructions && (
                    <li><strong>Entry Instructions:</strong> {p.entry_instructions}</li>
                  )}
                </ul>
              </div>
            </div>
          );
        } catch { return null; }
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
            
            {(job.add_ons && job.add_ons.length > 0) && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground block mb-2">Up-Sells &amp; Extra Charges</span>
                  <div className="space-y-1.5">
                    {job.add_ons.map((addon, i) => (
                      <div key={i} className="flex justify-between bg-amber-50 text-amber-900 border border-amber-100 p-2 rounded text-xs">
                        <span>{addon.startsWith('Extra:') ? addon.replace(/ \(\$\d+\.?\d*\)$/, '') : addon.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        {addon.match(/\(\$(\d+\.?\d*)\)$/) ? (
                          <span className="font-bold text-amber-700">${addon.match(/\(\$(\d+\.?\d*)\)$/)?.[1]}</span>
                        ) : (
                          <span className="text-amber-700/70 italic">Included in quote</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

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
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><Link href={`/wegettinmoneynga/customers/${customer.id}`} className="text-primary hover:underline">{customer.full_name}</Link></div>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><Link href={`/wegettinmoneynga/contractors/${contractor.id}`} className="text-primary hover:underline">{contractor.full_name}</Link></div>
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
            <p className="text-sm font-medium">Smart Suggestions</p>
            {loadingSuggestions ? (
              <p className="text-sm text-muted-foreground">Calculating routes and scoring...</p>
            ) : availableContractors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contractors available for this slot.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableContractors.map((c, idx) => (
                  <div
                    key={c.contractor_id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedContractors.includes(c.contractor_id) ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedContractors((prev) =>
                        prev.includes(c.contractor_id)
                          ? prev.filter((id) => id !== c.contractor_id)
                          : prev.length < 5 ? [...prev, c.contractor_id] : prev
                      );
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.full_name}</span>
                        {idx === 0 && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Best Match</span>}
                        {c.drive_minutes !== null && (
                          <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {c.drive_minutes}m drive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Score: {c.score}/5 · {c.jobs_today} jobs today
                      </p>
                      <p className="text-[10px] text-muted-foreground italic mt-0.5 opacity-80">
                        {c.reason}
                      </p>
                    </div>
                    <Checkbox checked={selectedContractors.includes(c.contractor_id)} />
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
