'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, MapPin, Navigation, Clock, DollarSign,
  CheckCircle2, User, Sparkles, Bath, BedDouble,
} from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job, ChecklistData, JobOffer } from '@/types';
import Link from 'next/link';
import { LocationPermissionPrompt } from '@/components/contractor/LocationPermissionPrompt';
import { startLocationTracking, stopLocationTracking } from '@/lib/location-service';
import { PhotoUpload } from '@/components/contractor/PhotoUpload';
import { SupplyCheck } from '@/components/contractor/SupplyCheck';

function buildChecklist(bedrooms: number, bathrooms: number, addOns: string[]): ChecklistData {
  return {
    kitchen: { counters: false, sink: false, stovetop: false, exterior_appliances: false, cabinet_fronts: false, floor: false, microwave_exterior: false },
    bathrooms: Array.from({ length: bathrooms }, () => ({ toilet: false, sink: false, shower_tub: false, mirror: false, counter: false, floor: false, garbage: false })),
    bedrooms: Array.from({ length: bedrooms }, () => ({ dust_surfaces: false, vacuum_mop: false, light_tidy: false })),
    living_areas: { dusting: false, floors: false, surfaces: false, garbage: false },
    add_ons: {
      ...(addOns.includes('inside_fridge') ? { inside_fridge: false } : {}),
      ...(addOns.includes('inside_oven') ? { inside_oven: false } : {}),
      ...(addOns.includes('inside_cabinets') ? { inside_cabinets: false } : {}),
      ...(addOns.includes('baseboards') ? { baseboards: false } : {}),
      ...(addOns.includes('interior_windows') ? { interior_windows: false } : {}),
    },
    contractor_notes: '',
    scope_changes_noted: '',
    completed_at: '',
  };
}

export default function ContractorJobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [pendingOffer, setPendingOffer] = useState<JobOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [supplyConfirmed, setSupplyConfirmed] = useState(false);
  const [showSupplyCheck, setShowSupplyCheck] = useState(false);

  async function fetchData() {
    try {
      const res = await fetch(`/api/jobs/${params.id}`);
      const data = await res.json();
      if (data && !data.error) {
        setJob(data);
        if (!checklist) {
          setChecklist(buildChecklist(data.home_bedrooms ?? 2, data.home_bathrooms ?? 1, data.add_ons ?? []));
        }
        if (data.status === 'offered') {
          const offersRes = await fetch('/api/offers');
          const offersData = await offersRes.json();
          const myOffer = (offersData || []).find((o: JobOffer) => o.job_id === params.id);
          setPendingOffer(myOffer || null);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, [params.id]);

  async function handleStatusUpdate(newStatus: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      if (newStatus === 'on_the_way' && job?.assigned_contractor_id) {
        startLocationTracking(job.assigned_contractor_id, job.id);
      }
      if (newStatus === 'completed' && job?.assigned_contractor_id) {
        stopLocationTracking(job.assigned_contractor_id);
      }
      toast.success('Status updated');
      fetchData();
    } catch { toast.error('Failed to update status'); }
    finally { setSubmitting(false); }
  }

  async function handleOfferResponse(action: 'accept' | 'decline') {
    if (!pendingOffer) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/offers/${pendingOffer.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 422) toast.error('This job is no longer available');
        else throw new Error(error.error || 'Failed to respond');
      } else {
        toast.success(action === 'accept' ? 'Job accepted!' : 'Offer declined');
      }
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  }

  function countChecked(): { checked: number; total: number } {
    if (!checklist) return { checked: 0, total: 0 };
    let checked = 0, total = 0;
    Object.values(checklist.kitchen).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } });
    checklist.bathrooms.forEach(b => Object.values(b).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } }));
    checklist.bedrooms.forEach(b => Object.values(b).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } }));
    Object.values(checklist.living_areas).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } });
    Object.values(checklist.add_ons).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } });
    return { checked, total };
  }

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;
  if (!job) return <p className="text-red-500 p-4">Job not found</p>;

  const { checked, total } = countChecked();
  const progress = total > 0 ? (checked / total) * 100 : 0;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.address_line1}, ${job.city} ${job.postal_code}`)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/contractor"><Button variant="ghost" size="sm" className="h-10 w-10 p-0"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="font-bold">{SERVICE_TYPE_LABELS[job.service_type]}</h1>
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Offer Action Banner */}
      {job.status === 'offered' && pendingOffer && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="p-4 space-y-4">
            <div className="text-center">
              <p className="font-bold text-amber-800 dark:text-amber-200">New Job Offer!</p>
              <p className="text-2xl font-black text-amber-900 dark:text-amber-100">${(job.quoted_price * 0.7).toFixed(0)}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 uppercase font-bold tracking-tighter">Your Estimated Payout</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleOfferResponse('accept')} className="flex-1 h-12 bg-green-600 hover:bg-green-700" disabled={submitting}>Accept Job</Button>
              <Button onClick={() => handleOfferResponse('decline')} variant="outline" className="flex-1 h-12 border-amber-300" disabled={submitting}>Decline</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Details Card */}
      <Card className="border-blue-200 dark:border-blue-800 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-100" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Job Details</span>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-full p-2"><User className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
            <div><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Customer</p><p className="font-semibold text-sm">{job.customer?.full_name ?? 'N/A'}</p></div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-start gap-3">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-full p-2 mt-0.5"><MapPin className="h-4 w-4 text-green-600 dark:text-green-400" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Address</p>
              <p className="font-semibold text-sm">{job.address_line1}</p>
              {job.address_line2 && <p className="text-xs text-muted-foreground">{job.address_line2}</p>}
              <p className="text-xs text-muted-foreground">{job.city}, {job.postal_code}</p>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1"><Clock className="h-3 w-3" /> Window</p><p className="text-sm font-medium">{TIME_WINDOW_LABELS[job.scheduled_window]}</p></div>
            {job.home_bedrooms != null && <div className="space-y-1"><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1"><BedDouble className="h-3 w-3" /> Beds</p><p className="text-sm font-medium">{job.home_bedrooms}</p></div>}
            {job.home_bathrooms != null && <div className="space-y-1"><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1"><Bath className="h-3 w-3" /> Baths</p><p className="text-sm font-medium">{job.home_bathrooms}</p></div>}
          </div>

          {/* Scope checklist preview */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Cleaning Scope</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Kitchen</span>
              {job.home_bathrooms != null && <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{job.home_bathrooms} Bathroom{job.home_bathrooms > 1 ? 's' : ''}</span>}
              {job.home_bedrooms != null && <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{job.home_bedrooms} Bedroom{job.home_bedrooms > 1 ? 's' : ''}</span>}
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Living Areas</span>
              {(job.add_ons || []).map(a => <span key={a} className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>)}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex justify-between items-center">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" /><span className="text-sm font-bold text-green-800 dark:text-green-200">Your Payout</span></div>
            <span className="text-xl font-black text-green-700 dark:text-green-300">${(job.quoted_price * 0.7).toFixed(0)}</span>
          </div>

          {job.access_instructions && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs">
              <strong className="text-amber-800 dark:text-amber-200">🔑 Access Instructions:</strong>
              <p className="mt-1 text-amber-700 dark:text-amber-300">{job.access_instructions}</p>
            </div>
          )}

          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full h-11 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">
              <Navigation className="h-4 w-4 mr-2" />Open in Maps
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* On My Way CTA */}
      {['accepted', 'assigned'].includes(job.status) && (
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-blue-500 opacity-20 animate-ping" style={{ animationDuration: '2s' }} />
          <Button id="on-my-way-btn" onClick={() => handleStatusUpdate('on_the_way')} className="relative w-full h-16 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30" disabled={submitting}>
            <Navigation className="h-6 w-6 mr-2" />{submitting ? 'Updating...' : "🚗 I'm On My Way"}
          </Button>
        </div>
      )}

      {/* Arrived — Supply Check Gate */}
      {job.status === 'on_the_way' && !supplyConfirmed && !showSupplyCheck && (
        <Button onClick={() => setShowSupplyCheck(true)} className="w-full h-14 text-base bg-green-600 hover:bg-green-700" disabled={submitting}>
          <CheckCircle2 className="h-5 w-5 mr-2" />I&apos;ve Arrived
        </Button>
      )}

      {job.status === 'on_the_way' && showSupplyCheck && !supplyConfirmed && (
        <SupplyCheck onConfirmed={() => { setSupplyConfirmed(true); handleStatusUpdate('in_progress'); }} bringsOwnSupplies={true} />
      )}

      {/* Before Photos (visible after arriving, before/during job) */}
      {['on_the_way', 'in_progress'].includes(job.status) && (
        <PhotoUpload category="before" jobId={job.id} maxPhotos={6} />
      )}

      {/* Checklist (visible during in_progress) */}
      {job.status === 'in_progress' && checklist && (
        <>
          <Card><CardContent className="p-4"><div className="flex justify-between text-sm mb-2"><span className="font-medium">Checklist Progress</span><span>{checked} of {total}</span></div><Progress value={progress} className="h-2" /></CardContent></Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Kitchen</CardTitle></CardHeader><CardContent className="space-y-3">
            {Object.entries(checklist.kitchen).map(([key, val]) => (
              <label key={key} className="flex items-center gap-3 py-1 min-h-[44px] cursor-pointer">
                <Checkbox checked={val as boolean} onCheckedChange={(c) => setChecklist({ ...checklist, kitchen: { ...checklist.kitchen, [key]: !!c } })} />
                <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </CardContent></Card>

          {checklist.bathrooms.map((bath, i) => (
            <Card key={`bath-${i}`}><CardHeader className="pb-2"><CardTitle className="text-base">Bathroom {i + 1}</CardTitle></CardHeader><CardContent className="space-y-3">
              {Object.entries(bath).map(([key, val]) => (
                <label key={key} className="flex items-center gap-3 py-1 min-h-[44px] cursor-pointer">
                  <Checkbox checked={val as boolean} onCheckedChange={(c) => { const newBaths = [...checklist.bathrooms]; newBaths[i] = { ...newBaths[i], [key]: !!c }; setChecklist({ ...checklist, bathrooms: newBaths }); }} />
                  <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </CardContent></Card>
          ))}

          {checklist.bedrooms.map((bed, i) => (
            <Card key={`bed-${i}`}><CardHeader className="pb-2"><CardTitle className="text-base">Bedroom {i + 1}</CardTitle></CardHeader><CardContent className="space-y-3">
              {Object.entries(bed).map(([key, val]) => (
                <label key={key} className="flex items-center gap-3 py-1 min-h-[44px] cursor-pointer">
                  <Checkbox checked={val as boolean} onCheckedChange={(c) => { const newBeds = [...checklist.bedrooms]; newBeds[i] = { ...newBeds[i], [key]: !!c }; setChecklist({ ...checklist, bedrooms: newBeds }); }} />
                  <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </CardContent></Card>
          ))}

          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Living Areas</CardTitle></CardHeader><CardContent className="space-y-3">
            {Object.entries(checklist.living_areas).map(([key, val]) => (
              <label key={key} className="flex items-center gap-3 py-1 min-h-[44px] cursor-pointer">
                <Checkbox checked={val as boolean} onCheckedChange={(c) => setChecklist({ ...checklist, living_areas: { ...checklist.living_areas, [key]: !!c } })} />
                <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </CardContent></Card>

          {/* After Photos — required before completing */}
          <PhotoUpload category="after" jobId={job.id} maxPhotos={8} />

          <Card><CardContent className="p-4"><Label>Notes (optional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any issues or scope changes..." className="mt-2 min-h-[80px]" /></CardContent></Card>

          <Button onClick={() => handleStatusUpdate('completed')} className="w-full h-14 text-base bg-green-600 hover:bg-green-700" disabled={submitting || progress < 100}>
            <CheckCircle2 className="h-5 w-5 mr-2" />Submit & Complete Job
          </Button>
        </>
      )}

      {/* Completed view */}
      {['completed', 'reviewed', 'paid_out'].includes(job.status) && (
        <Card><CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h2 className="font-bold text-lg">Job Complete</h2>
          <p className="text-muted-foreground text-sm mt-1">Payout: ${(job.quoted_price * 0.7).toFixed(2)}</p>
        </CardContent></Card>
      )}

      <LocationPermissionPrompt />
    </div>
  );
}
