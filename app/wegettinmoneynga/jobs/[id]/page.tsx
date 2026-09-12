'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Send, MapPin, DollarSign,
  User, Star, AlertTriangle, Pencil, Users, UserCheck,
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
import type { Job, Employee, JobStatus } from '@/types';
import Link from 'next/link';

import { TIME_OPTIONS, DURATION_OPTIONS, formatJobTimeSlot, inferTimeWindow } from '@/lib/time-utils';

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
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
      setAvailableEmployees(data.suggestions || []);
    } catch {
      setAvailableEmployees([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleAssignCleaners(customEmployeeIds?: string[], nameHint?: string) {
    const idsToAssign = customEmployeeIds || selectedEmployees;
    if (idsToAssign.length === 0) {
      toast.error('Select at least one cleaner to assign');
      return;
    }
    setDispatching(true);
    try {
      const res = await fetch(`/api/jobs/${params.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'direct_assign', employee_ids: idsToAssign }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign cleaners');
      }
      const label = nameHint || `${idsToAssign.length} cleaner${idsToAssign.length > 1 ? 's' : ''}`;
      toast.success(`Assigned ${label} to job!`);
      setDispatchOpen(false);
      setSelectedEmployees([]);
      fetchJob();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDispatching(false);
    }
  }

  async function handleDispatch() {
    if (selectedEmployees.length === 0) {
      toast.error('Select at least one employee');
      return;
    }
    setDispatching(true);
    try {
      const driveTimes = selectedEmployees.map(id => {
        const c = availableEmployees.find(ac => ac.employee_id === id);
        return c ? c.drive_minutes : null;
      });

      const res = await fetch(`/api/jobs/${params.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'broadcast_offers', employee_ids: selectedEmployees, drive_times: driveTimes }),
      });
      if (!res.ok) throw new Error('Dispatch failed');
      toast.success(`Offers sent to ${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''}`);
      setDispatchOpen(false);
      setSelectedEmployees([]);
      fetchJob();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setDispatching(false);
    }
  }

  async function handleEditJob() {
    try {
      const payload = {
        ...editForm,
        scheduled_window: editForm.scheduled_start_time ? inferTimeWindow(editForm.scheduled_start_time) : editForm.scheduled_window,
      };
      const res = await fetch(`/api/jobs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
  const employee = (job as any).employee;

  const estimatedDurationHours = (job.estimated_duration_minutes ? job.estimated_duration_minutes / 60 : 3.5);
  let cleanerWage = 25.0;
  if (employee) {
    if (employee.hourly_wage) cleanerWage = Number(employee.hourly_wage);
    else if (employee.notes) {
      try { cleanerWage = Number(JSON.parse(employee.notes).hourly_wage) || 25.0; } catch {}
    }
  }
  const estimatedCleanerPay = estimatedDurationHours * cleanerWage;

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
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start Time</Label>
                  <Select value={editForm.scheduled_start_time || '15:00'} onValueChange={v => setEditForm({ ...editForm, scheduled_start_time: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Est. Duration</Label>
                  <Select value={(editForm.estimated_duration_minutes || 360).toString()} onValueChange={v => setEditForm({ ...editForm, estimated_duration_minutes: parseInt(v, 10) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(d => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
            <div className="flex justify-between"><span className="text-muted-foreground">Time Slot</span><span className="font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{formatJobTimeSlot(job)}</span></div>
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
            <div className="flex justify-between"><span className="text-muted-foreground">Est. Cleaner Wage ({estimatedDurationHours.toFixed(1)}h @ ${cleanerWage.toFixed(2)}/hr)</span><span className="font-bold text-indigo-700">${estimatedCleanerPay.toFixed(2)}</span></div>
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

        {/* Employee / Assigned Crew */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                {job.assigned_employees && job.assigned_employees.length > 1 
                  ? `Assigned Crew (${job.assigned_employees.length} Cleaners)` 
                  : 'Assigned Cleaner'}
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600 hover:text-blue-700" onClick={openDispatch}>
                {job.assigned_employee_id ? 'Change / Add Cleaners' : 'Dispatch'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {job.assigned_employees && job.assigned_employees.length > 0 ? (
              <div className="space-y-2.5">
                {job.assigned_employees.map((emp, idx) => (
                  <div key={emp.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link href={`/wegettinmoneynga/employees/${emp.id}`} className="font-semibold text-primary hover:underline">
                          {emp.full_name}
                        </Link>
                        {idx === 0 && job.assigned_employees!.length > 1 && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold uppercase">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{emp.phone || emp.email || '—'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-indigo-700 block">
                        ${((emp as any).hourly_wage || 25).toFixed(2)}/hr
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ★ {emp.score ?? '5.00'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : employee ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><Link href={`/wegettinmoneynga/employees/${employee.id}`} className="text-primary hover:underline">{employee.full_name}</Link></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{employee.phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span>{employee.score}/5.00</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Hourly Wage</span><span className="font-semibold text-indigo-700">${cleanerWage.toFixed(2)}/hr</span></div>
              </>
            ) : (
              <div className="py-2 text-center text-muted-foreground">
                <p className="text-xs">No cleaner assigned yet.</p>
                <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={openDispatch}>
                  <Send className="h-3 w-3 mr-1" /> Dispatch Cleaners
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Modal */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Dispatch Job {job.job_number}</DialogTitle>
            <DialogDescription>
              Select one or multiple cleaners to assign directly as a crew, or broadcast offers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border text-sm space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {SERVICE_TYPE_LABELS[job.service_type]} — {format(new Date(job.scheduled_date), 'MMM d, yyyy')} {TIME_WINDOW_LABELS[job.scheduled_window]}
                  </p>
                  <p className="text-muted-foreground text-xs">{job.address_line1}, {job.city}</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs text-indigo-700 bg-indigo-50 border-indigo-200">
                  Est. {estimatedDurationHours.toFixed(1)} hrs
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Available Cleaners ({availableEmployees.length})</p>
              <span className="text-xs text-muted-foreground">Ranked by shortest drive & score</span>
            </div>

            {loadingSuggestions ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Calculating routes and smart matches...</p>
            ) : availableEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No active employees found.</p>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-72">
                {availableEmployees.map((c, idx) => (
                  <div
                    key={c.employee_id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selectedEmployees.includes(c.employee_id) ? 'border-primary bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <Checkbox 
                        checked={selectedEmployees.includes(c.employee_id)}
                        onCheckedChange={() => {
                          setSelectedEmployees((prev) =>
                            prev.includes(c.employee_id)
                              ? prev.filter((id) => id !== c.employee_id)
                              : [...prev, c.employee_id]
                          );
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{c.full_name}</span>
                          {idx === 0 && (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Best Match
                            </span>
                          )}
                          {c.drive_minutes !== null && (
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {c.drive_minutes}m drive
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200">
                            ${(c.hourly_wage || 25).toFixed(2)}/hr · Est. ${(c.estimated_pay || (estimatedDurationHours * 25)).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Score: {c.score?.toFixed(1) ?? '5.0'}/5.0 · {c.jobs_today} job{c.jobs_today === 1 ? '' : 's'} today
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      disabled={dispatching}
                      onClick={() => handleAssignCleaners([c.employee_id], c.full_name)}
                      className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium shrink-0 dark:bg-slate-100 dark:text-slate-900"
                    >
                      Assign Solo
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => handleAssignCleaners()} 
                disabled={dispatching || selectedEmployees.length === 0} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
              >
                <UserCheck className="h-4 w-4 mr-1.5" />
                Assign Selected {selectedEmployees.length > 1 ? `Crew (${selectedEmployees.length})` : `Cleaner (${selectedEmployees.length})`}
              </Button>
              <Button 
                onClick={handleDispatch} 
                disabled={dispatching || selectedEmployees.length === 0} 
                variant="outline"
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Broadcast Offers ({selectedEmployees.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
