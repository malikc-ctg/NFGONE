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
  Camera, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job, ChecklistData } from '@/types';
import Link from 'next/link';
import { JobRouteMap } from '@/components/contractor/JobRouteMap';
import { LocationPermissionPrompt } from '@/components/contractor/LocationPermissionPrompt';
import { startLocationTracking, stopLocationTracking } from '@/lib/location-service';

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
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchJob() {
    const res = await fetch(`/api/jobs?limit=1000`);
    const data = await res.json();
    const found = (Array.isArray(data) ? data : []).find((j: any) => j.id === params.id);
    if (found) {
      setJob(found);
      if (!checklist) {
        setChecklist(buildChecklist(
          found.home_bedrooms ?? 2,
          found.home_bathrooms ?? 1,
          found.add_ons ?? [],
        ));
      }
    }
    setLoading(false);
  }

  useEffect(() => { fetchJob(); }, [params.id]);

  async function handleStatusUpdate(newStatus: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');

      // Start/stop location tracking based on status
      if (newStatus === 'on_the_way' && job?.assigned_contractor_id) {
        startLocationTracking(job.assigned_contractor_id, job.id);
      }
      if (newStatus === 'completed' && job?.assigned_contractor_id) {
        stopLocationTracking(job.assigned_contractor_id);
      }

      toast.success('Status updated');
      fetchJob();
    } catch { toast.error('Failed to update status'); }
    finally { setSubmitting(false); }
  }

  // Count checked items
  function countChecked(): { checked: number; total: number } {
    if (!checklist) return { checked: 0, total: 0 };
    let checked = 0, total = 0;
    // Kitchen
    Object.values(checklist.kitchen).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } });
    // Bathrooms
    checklist.bathrooms.forEach(b => Object.values(b).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } }));
    // Bedrooms
    checklist.bedrooms.forEach(b => Object.values(b).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } }));
    // Living
    Object.values(checklist.living_areas).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } });
    // Add-ons
    Object.values(checklist.add_ons).forEach(v => { if (typeof v === 'boolean') { total++; if (v) checked++; } });
    return { checked, total };
  }

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;
  if (!job) return <p className="text-red-500 p-4">Job not found</p>;

  const { checked, total } = countChecked();
  const progress = total > 0 ? (checked / total) * 100 : 0;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${job.address_line1}, ${job.city} ${job.postal_code}`
  )}`;

  const showRouteMap = ['assigned', 'on_the_way'].includes(job.status) &&
    job.latitude && job.longitude;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/contractor"><Button variant="ghost" size="sm" className="h-10 w-10 p-0"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="font-bold">{SERVICE_TYPE_LABELS[job.service_type]}</h1>
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Route map (shown when assigned or on_the_way with geocoded coordinates) */}
      {showRouteMap && (
        <JobRouteMap
          jobLatitude={job.latitude!}
          jobLongitude={job.longitude!}
          jobAddress={`${job.address_line1}, ${job.city} ${job.postal_code}`}
        />
      )}

      {/* Job info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">{job.address_line1}</p>
              <p className="text-xs text-muted-foreground">{job.city} {job.postal_code}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-sm"><Clock className="h-4 w-4 text-muted-foreground" />{TIME_WINDOW_LABELS[job.scheduled_window]}</span>
            <span className="flex items-center gap-1 text-sm"><DollarSign className="h-4 w-4 text-muted-foreground" />${(job.quoted_price * 0.7).toFixed(0)}</span>
          </div>
          {job.access_instructions && (
            <div className="bg-muted p-3 rounded-lg text-xs">
              <strong>Access:</strong> {job.access_instructions}
            </div>
          )}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full h-12">
              <Navigation className="h-4 w-4 mr-2" />Open in Maps
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Status actions */}
      {job.status === 'assigned' && (
        <Button onClick={() => handleStatusUpdate('on_the_way')} className="w-full h-14 text-base bg-blue-600 hover:bg-blue-700" disabled={submitting}>
          <Navigation className="h-5 w-5 mr-2" />On My Way
        </Button>
      )}

      {job.status === 'on_the_way' && (
        <Button onClick={() => handleStatusUpdate('in_progress')} className="w-full h-14 text-base bg-green-600 hover:bg-green-700" disabled={submitting}>
          <CheckCircle2 className="h-5 w-5 mr-2" />I&apos;ve Arrived — Start Job
        </Button>
      )}

      {/* Checklist (visible during in_progress) */}
      {job.status === 'in_progress' && checklist && (
        <>
          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Checklist Progress</span>
                <span>{checked} of {total}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          {/* Kitchen */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Kitchen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(checklist.kitchen).map(([key, val]) => (
                <label key={key} className="flex items-center gap-3 py-1 min-h-[44px] cursor-pointer">
                  <Checkbox checked={val as boolean} onCheckedChange={(c) => setChecklist({ ...checklist, kitchen: { ...checklist.kitchen, [key]: !!c } })} />
                  <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Bathrooms */}
          {checklist.bathrooms.map((bath, i) => (
            <Card key={`bath-${i}`}>
              <CardHeader className="pb-2"><CardTitle className="text-base">Bathroom {i + 1}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(bath).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-3 py-1 min-h-[44px] cursor-pointer">
                    <Checkbox checked={val as boolean} onCheckedChange={(c) => {
                      const newBaths = [...checklist.bathrooms];
                      newBaths[i] = { ...newBaths[i], [key]: !!c };
                      setChecklist({ ...checklist, bathrooms: newBaths });
                    }} />
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Bedrooms */}
          {checklist.bedrooms.map((bed, i) => (
            <Card key={`bed-${i}`}>
              <CardHeader className="pb-2"><CardTitle className="text-base">Bedroom {i + 1}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(bed).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-3 py-1 min-h-[44px] cursor-pointer">
                    <Checkbox checked={val as boolean} onCheckedChange={(c) => {
                      const newBeds = [...checklist.bedrooms];
                      newBeds[i] = { ...newBeds[i], [key]: !!c };
                      setChecklist({ ...checklist, bedrooms: newBeds });
                    }} />
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Living areas */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Living Areas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(checklist.living_areas).map(([key, val]) => (
                <label key={key} className="flex items-center gap-3 py-1 min-h-[44px] cursor-pointer">
                  <Checkbox checked={val as boolean} onCheckedChange={(c) => setChecklist({ ...checklist, living_areas: { ...checklist.living_areas, [key]: !!c } })} />
                  <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="p-4">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any issues or scope changes..." className="mt-2 min-h-[80px]" />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            onClick={() => handleStatusUpdate('completed')}
            className="w-full h-14 text-base bg-green-600 hover:bg-green-700"
            disabled={submitting || progress < 100}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Submit & Complete Job
          </Button>
        </>
      )}

      {/* Completed view */}
      {['completed', 'reviewed', 'paid_out'].includes(job.status) && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="font-bold text-lg">Job Complete</h2>
            <p className="text-muted-foreground text-sm mt-1">Payout: ${(job.quoted_price * 0.7).toFixed(2)}</p>
          </CardContent>
        </Card>
      )}

      {/* Location permission prompt */}
      <LocationPermissionPrompt />
    </div>
  );
}
