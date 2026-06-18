'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  MapPin, Briefcase, DollarSign, Star, TrendingUp,
  Clock, CheckCircle2, ArrowRight, CalendarDays,
  Sparkles, Bath, BedDouble, ChevronRight, Timer, Package, Key, Info,
  AlertTriangle, UploadCloud, FileText, Loader2, Camera
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job, JobOffer, Contractor } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [todaysJobs, setTodaysJobs] = useState<Job[]>([]);
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
      
      let filteredJobs = Array.isArray(jobsData) ? jobsData : [];
      const now = new Date().getTime();
      filteredJobs = filteredJobs.filter(job => {
        if (job.status === 'cancelled') {
          const updated = new Date(job.updated_at).getTime();
          return (now - updated) < 15 * 60 * 1000; // 15 mins
        }
        return true;
      });

      const statusPriority: Record<string, number> = {
        in_progress: 1,
        on_the_way: 2,
        assigned: 3,
        accepted: 4,
        completed: 5,
        cancelled: 6,
      };

      filteredJobs.sort((a, b) => {
        const pA = statusPriority[a.status] || 99;
        const pB = statusPriority[b.status] || 99;
        return pA - pB;
      });

      setTodaysJobs(filteredJobs);

      // 3. Get pending offers
      const offersRes = await fetch('/api/offers');
      const offersData = await offersRes.json();
      setPendingOffers(Array.isArray(offersData) ? offersData : []);

      // 4. Get stats
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
        if (action === 'accept') {
          toast.success('Job Secured! 🎉');
          // Find the offer to get the job_id
          const offer = pendingOffers.find(o => o.id === offerId);
          if (offer && offer.job_id) {
            router.push(`/contractor/jobs/${offer.job_id}`);
            return; // Exit early so we don't refetch data while transitioning
          }
        } else {
          toast.success('Offer declined');
        }
      }
      
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRespondingId(null);
    }
  }

  // Check if they have insurance and profile photo
  let hasInsurance = false;
  let hasProfilePhoto = false;
  
  if (contractor) {
    const notesStr = contractor.notes || '{}';
    try {
      const notesObj = JSON.parse(notesStr);
      if (notesObj.insurance_details?.provider || notesObj.insurance_details?.policy_number || notesObj.insurance_details?.file_url) {
        hasInsurance = true;
      }
      if (notesObj.profile_photo_url) {
        hasProfilePhoto = true;
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

  async function handleProfilePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contractor) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${contractor.id}-${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
      
      const response = await fetch('/api/contractors/me/photo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_photo_url: publicUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile photo');
      }
      
      toast.success('Profile photo uploaded successfully!');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to upload photo: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  const isEligible = hasInsurance && hasProfilePhoto;

  if (!isClient || (loading && !contractor)) {
    return (
      <div className="space-y-5 animate-pulse">
        {/* Hero Skeleton */}
        <Skeleton className="h-40 w-full rounded-xl" />
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        
        {/* Quick Actions Skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>
        
        {/* Main List Skeleton */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-6 w-32 mb-4" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Hero Header ── */}
      <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-800 text-white border-0 shadow-lg shadow-indigo-500/20 overflow-hidden relative group">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20 transition-transform duration-700 group-hover:scale-110">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white blur-3xl rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-300 blur-2xl rounded-full" />
        </div>
        
        {/* Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 shadow-sm backdrop-blur-md transition-colors">
              <Sparkles className="w-3 h-3 mr-1" /> Contractor Portal
            </Badge>
            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider bg-black/10 px-2 py-1 rounded-full backdrop-blur-sm">
              {isClient ? format(new Date(), 'EEEE, MMM d') : '...'}
            </p>
          </div>
          
          <h1 className="text-2xl font-black tracking-tight drop-shadow-sm">
            Welcome back, {contractor?.full_name?.split(' ')[0] || ''}
          </h1>
          
          {stats && (
            <p className="text-indigo-100/90 text-xs mt-1.5 font-medium flex items-center gap-1.5">
              {stats.week_jobs > 0 ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-green-300" /> {stats.week_jobs} job{stats.week_jobs > 1 ? 's' : ''} completed this week</>
              ) : (
                <><TrendingUp className="w-3.5 h-3.5 text-indigo-300" /> No jobs completed yet this week</>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Requirements Reminders ── */}
      {!loading && !isEligible && (
        <div className="space-y-3">
          {!hasInsurance && (
            <Card className="border-amber-200/50 bg-amber-50/80 dark:bg-amber-950/20 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100/80 dark:bg-amber-900/40 flex items-center justify-center shrink-0 shadow-inner">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 dark:text-amber-400 tracking-tight">Action Required: Liability Insurance</h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 max-w-sm">
                      Please upload your liability insurance slip to start accepting jobs.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 relative w-full md:w-auto">
                  <Input 
                    type="file" 
                    accept="image/*,.pdf" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    onChange={handleInsuranceUpload}
                    disabled={isUploading}
                  />
                  <Button variant="outline" className="w-full md:w-auto bg-white/60 dark:bg-black/40 hover:bg-white dark:hover:bg-black border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-semibold shadow-sm transition-all" disabled={isUploading}>
                    {isUploading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</span>
                    ) : (
                      <><UploadCloud className="h-4 w-4 mr-2" /> Upload Slip</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!hasProfilePhoto && (
            <Card className="border-blue-200/50 bg-blue-50/80 dark:bg-blue-950/20 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center shrink-0 shadow-inner">
                    <Camera className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 dark:text-blue-400 tracking-tight">Action Required: Profile Photo</h3>
                    <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-0.5 max-w-sm">
                      Please upload a clear picture of your face to build trust with customers. You cannot accept jobs without one.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 relative w-full md:w-auto">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    onChange={handleProfilePhotoUpload}
                    disabled={isUploading}
                  />
                  <Button variant="outline" className="w-full md:w-auto bg-white/60 dark:bg-black/40 hover:bg-white dark:hover:bg-black border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-semibold shadow-sm transition-all" disabled={isUploading}>
                    {isUploading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</span>
                    ) : (
                      <><UploadCloud className="h-4 w-4 mr-2" /> Upload Photo</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Stats Row ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-card border-emerald-100/50 dark:border-emerald-900/30 hover:shadow-md hover:shadow-emerald-500/10 transition-all hover:-translate-y-0.5">
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-2 shadow-inner">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">${stats.week_earnings}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">This Week</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-card border-amber-100/50 dark:border-amber-900/30 hover:shadow-md hover:shadow-amber-500/10 transition-all hover:-translate-y-0.5">
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-2 shadow-inner">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:amber-400" />
              </div>
              <p className="text-xl font-black text-amber-700 dark:text-amber-400 tracking-tight">${stats.pending_payout}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-card border-blue-100/50 dark:border-blue-900/30 hover:shadow-md hover:shadow-blue-500/10 transition-all hover:-translate-y-0.5">
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-2 shadow-inner">
                <Star className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-blue-600/20" />
              </div>
              <p className="text-xl font-black text-blue-700 dark:text-blue-400 tracking-tight">{stats.score.toFixed(1)}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Rating</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="flex gap-2">
        <Link href="/contractor/jobs" className="flex-1">
          <Button variant="outline" className="w-full h-10 text-xs font-medium">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            View All Jobs
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
      {isEligible && pendingOffers.length > 0 && (
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
      {isEligible && (
        <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Today&apos;s Schedule
        </h2>
        {todaysJobs.length === 0 ? (
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
      )}
    </div>
  );
}
