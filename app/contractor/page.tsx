'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  MapPin, Briefcase, DollarSign, Star, TrendingUp,
  Clock, CheckCircle2, ArrowRight, CalendarDays,
  Sparkles, Bath, BedDouble, ChevronRight, Timer, Package, Key, Info,
  AlertTriangle, UploadCloud, FileText
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job, JobOffer, Contractor } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DashboardStats {
  score: number;
  week_earnings: number;
  month_earnings: number;
  week_jobs: number;
  total_completed: number;
  pending_payout: number;
}

/** Build a quick scope summary from job properties */
function buildScopeSummary(job: Job): string[] {
  const items: string[] = [];
  items.push('Kitchen');
  if (job.home_bathrooms) items.push(`${job.home_bathrooms} Bathroom${job.home_bathrooms > 1 ? 's' : ''}`);
  if (job.home_bedrooms) items.push(`${job.home_bedrooms} Bedroom${job.home_bedrooms > 1 ? 's' : ''}`);
  items.push('Living Areas');
  if (job.add_ons?.length) {
    job.add_ons.forEach(a => items.push(a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())));
  }
  return items;
}

export default function ContractorDashboard() {
  const [todaysJobs, setTodaysJobs] = useState<Job[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [pendingOffers, setPendingOffers] = useState<JobOffer[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    try {
      // 1. Get my profile
      const meRes = await fetch('/api/contractors/me');
      if (!meRes.ok) {
        const errorData = await meRes.json();
        throw new Error(errorData.error || 'Could not fetch profile');
      }
      const meData = await meRes.json();
      setContractor(meData);

      // 2. Get today's jobs (assigned to me)
      const today = format(new Date(), 'yyyy-MM-dd');
      const jobsRes = await fetch(`/api/jobs?date=${today}&contractor_id=${meData.id}`);
      const jobsData = await jobsRes.json();
      setTodaysJobs(Array.isArray(jobsData) ? jobsData : []);

      // 3. Get upcoming jobs (next 7 days)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const upcomingRes = await fetch(`/api/jobs?start_date=${format(tomorrow, 'yyyy-MM-dd')}&end_date=${format(nextWeek, 'yyyy-MM-dd')}&contractor_id=${meData.id}`);
      const upcomingData = await upcomingRes.json();
      setUpcomingJobs(Array.isArray(upcomingData) ? upcomingData : []);

      // 4. Get pending offers
      const offersRes = await fetch('/api/offers');
      const offersData = await offersRes.json();
      setPendingOffers(Array.isArray(offersData) ? offersData : []);

      // 5. Get stats
      const statsRes = await fetch('/api/contractors/me/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleOfferResponse(offerId: string, action: 'accept' | 'decline') {
    setRespondingId(offerId);
    try {
      const res = await fetch(`/api/offers/${offerId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          toast.error('This job is no longer available');
        } else {
          throw new Error(result.error || 'Failed to respond');
        }
      } else {
        toast.success(action === 'accept' ? 'Job accepted!' : 'Offer declined');
      }
      
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRespondingId(null);
    }
  }

  // Check if they have insurance
  let hasInsurance = false;
  if (contractor) {
    const notesStr = contractor.notes || '{}';
    try {
      const notesObj = JSON.parse(notesStr);
      if (notesObj.insurance_details?.provider || notesObj.insurance_details?.policy_number || notesObj.insurance_details?.file_url) {
        hasInsurance = true;
      }
    } catch { }
  }

  async function handleInsuranceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contractor) return;
    
    setIsUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${contractor.id}-${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;
      
      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
      
      // 3. Save via secure backend endpoint
      const response = await fetch('/api/contractors/me/insurance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: publicUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save insurance document');
      }
      
      toast.success('Insurance document uploaded successfully!');
      fetchData(); // Refresh data
    } catch (err: any) {
      toast.error('Failed to upload document: ' + err.message);
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Hero Header ── */}
      <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white border-0 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <CardContent className="p-5 relative">
          <p className="text-blue-200 text-xs font-medium">{isClient ? format(new Date(), 'EEEE, MMMM d') : '...'}</p>
          <h1 className="text-xl font-bold mt-1">
            Welcome back, {contractor?.full_name?.split(' ')[0] || ''}
          </h1>
          {stats && (
            <p className="text-blue-200 text-xs mt-1">
              {stats.week_jobs > 0
                ? `${stats.week_jobs} job${stats.week_jobs > 1 ? 's' : ''} completed this week`
                : 'No jobs completed yet this week'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Insurance Reminder ── */}
      {!loading && !hasInsurance && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-400">Action Required: Upload Insurance</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  You must provide proof of liability insurance before you can accept any jobs on the platform.
                </p>
              </div>
            </div>
            <div className="shrink-0 relative">
              <Input 
                type="file" 
                accept="image/*,.pdf" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleInsuranceUpload}
                disabled={isUploading}
              />
              <Button variant="destructive" disabled={isUploading}>
                {isUploading ? 'Uploading...' : (
                  <>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Upload PDF / Image
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Row ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-gradient-to-b from-green-50 to-white dark:from-green-950/30 dark:to-card border-green-100 dark:border-green-900/50">
            <CardContent className="p-3 text-center">
              <DollarSign className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-black text-green-700 dark:text-green-400">${stats.week_earnings}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">This Week</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/30 dark:to-card border-amber-100 dark:border-amber-900/50">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-black text-amber-700 dark:text-amber-400">${stats.pending_payout}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/30 dark:to-card border-blue-100 dark:border-blue-900/50">
            <CardContent className="p-3 text-center">
              <Star className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-black text-blue-700 dark:text-blue-400">{stats.score}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Rating</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="flex gap-2">
        <Link href="/contractor/availability" className="flex-1">
          <Button variant="outline" className="w-full h-10 text-xs font-medium">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Update Availability
          </Button>
        </Link>
        <Link href="/contractor/earnings" className="flex-1">
          <Button variant="outline" className="w-full h-10 text-xs font-medium">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            View Earnings
          </Button>
        </Link>
      </div>

      {/* ── Pending Offers ── */}
      {pendingOffers.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Available Offers
            </h2>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 animate-pulse">
              {pendingOffers.length} New
            </Badge>
          </div>
          {pendingOffers.map((offer) => {
            const scope = offer.job ? buildScopeSummary(offer.job as Job) : [];
            return (
              <Card key={offer.id} className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg leading-tight">
                        {offer.job ? SERVICE_TYPE_LABELS[offer.job.service_type] : 'Cleaning Job'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {offer.job?.city}, {offer.job?.postal_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-green-600 dark:text-green-400">
                        ${offer.job?.quoted_price ? (offer.job.quoted_price * 0.7).toFixed(0) : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Your Payout</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2 border-y border-amber-100 dark:border-amber-900/50">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Date</p>
                      <p className="text-sm font-medium">{offer.job ? format(new Date(offer.job.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Window</p>
                      <p className="text-sm font-medium">{offer.job ? TIME_WINDOW_LABELS[offer.job.scheduled_window] : '—'}</p>
                    </div>
                    {offer.job && offer.job.estimated_duration_minutes && (
                      <>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Est. Duration</p>
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Timer className="h-3 w-3 text-muted-foreground" />
                            {Math.floor(offer.job.estimated_duration_minutes / 60)}h {offer.job.estimated_duration_minutes % 60}m
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Implied Rate</p>
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${((offer.job.quoted_price * 0.7) / (offer.job.estimated_duration_minutes / 60)).toFixed(2)} / hr
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Checklist Preview */}
                  {scope.length > 0 && (
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Cleaning Scope
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {scope.map((item, i) => (
                          <span key={i} className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-medium">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Home details & Supplies */}
                  {offer.job && (
                    <div className="space-y-2">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {offer.job.home_bedrooms != null && (
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3 w-3" /> {offer.job.home_bedrooms} Bed{offer.job.home_bedrooms > 1 ? 's' : ''}
                          </span>
                        )}
                        {offer.job.home_bathrooms != null && (
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" /> {offer.job.home_bathrooms} Bath{offer.job.home_bathrooms > 1 ? 's' : ''}
                          </span>
                        )}
                        {offer.job.has_pets && (
                          <span className="flex items-center gap-1">🐾 Pets</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-blue-50/50 dark:bg-blue-900/20 flex items-center gap-1">
                          <Package className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          {offer.job.service_type.includes('deep') || offer.job.service_type.includes('move') ? 'Heavy-Duty Supplies Required' : 'Standard Supplies Required'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button 
                      className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold disabled:bg-slate-300" 
                      disabled={respondingId === offer.id || !hasInsurance}
                      onClick={() => handleOfferResponse(offer.id, 'accept')}
                    >
                      {!hasInsurance ? 'Insurance Required' : respondingId === offer.id ? 'Accepting...' : 'Accept Job'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12 border-amber-200 hover:bg-amber-100 dark:border-amber-800"
                      disabled={respondingId === offer.id}
                      onClick={() => handleOfferResponse(offer.id, 'decline')}
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Today's Jobs ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Today&apos;s Schedule
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-8 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : todaysJobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center space-y-2">
              <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">No jobs scheduled for today.</p>
              <p className="text-xs text-muted-foreground">Accept an available offer above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          todaysJobs.map((job) => {
            const scope = buildScopeSummary(job);
            const isActive = ['on_the_way', 'in_progress'].includes(job.status);
            return (
              <Link key={job.id} href={`/contractor/jobs/${job.id}`}>
                <Card className={`hover:bg-muted/50 transition-all cursor-pointer overflow-hidden ${
                  isActive
                    ? 'border-l-4 border-l-green-500 shadow-md shadow-green-500/10'
                    : 'border-l-4 border-l-blue-600'
                }`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                            {TIME_WINDOW_LABELS[job.scheduled_window]}
                          </Badge>
                          <StatusBadge status={job.status} />
                        </div>
                        <p className="font-bold text-base leading-tight">{SERVICE_TYPE_LABELS[job.service_type]}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{job.address_line1}, {job.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${(job.quoted_price * 0.7).toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">EARNED</p>
                      </div>
                    </div>

                    {/* Checklist/Scope Preview */}
                    <div className="bg-muted/40 rounded-lg p-2.5 space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> What To Clean
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {scope.map((item, i) => (
                          <span key={i} className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            {item}
                          </span>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                        {job.estimated_duration_minutes && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                            <Timer className="h-3 w-3" /> 
                            {Math.floor(job.estimated_duration_minutes / 60)}h {job.estimated_duration_minutes % 60}m
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <Package className="h-3 w-3" /> 
                          {job.service_type.includes('deep') || job.service_type.includes('move') ? 'Heavy-Duty Kit' : 'Standard Kit'}
                        </div>
                      </div>

                      {(job.access_instructions || job.scope_notes) && (
                        <div className="pt-2 border-t border-border/50 space-y-1">
                           {job.access_instructions && (
                             <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                               <Key className="h-3 w-3 mt-0.5 shrink-0" />
                               <span className="line-clamp-1">{job.access_instructions}</span>
                             </div>
                           )}
                           {job.scope_notes && (
                             <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                               <Info className="h-3 w-3 mt-0.5 shrink-0" />
                               <span className="line-clamp-1">{job.scope_notes}</span>
                             </div>
                           )}
                        </div>
                      )}
                    </div>

                    {/* Active job CTA */}
                    {isActive && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        In Progress — Tap to continue
                        <ArrowRight className="h-3 w-3 ml-auto" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* ── Upcoming Jobs ── */}
      {upcomingJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Upcoming
          </h2>
          {upcomingJobs.map((job) => {
            const scope = buildScopeSummary(job);
            return (
              <Link key={job.id} href={`/contractor/jobs/${job.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{SERVICE_TYPE_LABELS[job.service_type]}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(job.scheduled_date + 'T12:00:00'), 'EEE, MMM d')} · {TIME_WINDOW_LABELS[job.scheduled_window]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span className="text-sm font-bold">${(job.quoted_price * 0.7).toFixed(0)}</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {scope.slice(0, 4).map((item, i) => (
                        <span key={i} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {item}
                        </span>
                      ))}
                      {scope.length > 4 && (
                        <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          +{scope.length - 4} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
