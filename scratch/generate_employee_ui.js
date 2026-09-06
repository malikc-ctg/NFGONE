const fs = require('fs');
const path = require('path');

const fileContent = `'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Briefcase, DollarSign, Star, TrendingUp,
  Clock, CheckCircle2, ArrowRight, CalendarDays,
  Sparkles, Bath, BedDouble, ChevronRight, Timer, Package, Key, Info,
  AlertTriangle, UploadCloud, FileText, Loader2, Camera
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job, JobOffer, Employee } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DashboardStats {
  score: number;
  week_jobs: number;
  total_completed: number;
}

function buildScopeSummary(job: Job): string[] {
  const items: string[] = [];
  items.push('Kitchen');
  if (job.home_bathrooms) items.push(\`\${job.home_bathrooms} Bath\`);
  if (job.home_bedrooms) items.push(\`\${job.home_bedrooms} Bed\`);
  items.push('Living Areas');
  if (job.add_ons?.length) {
    job.add_ons.forEach(a => items.push(a.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())));
  }
  return items;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [todaysJobs, setTodaysJobs] = useState<Job[]>([]);
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClocking, setIsClocking] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/employees/me');
      if (!meRes.ok) {
        const errorData = await meRes.json();
        throw new Error(errorData.error || 'Could not fetch profile');
      }
      const meData = await meRes.json();
      setEmployee(meData);

      const today = format(new Date(), 'yyyy-MM-dd');
      const jobsRes = await fetch(\`/api/jobs?date=\${today}&employee_id=\${meData.id}\`);
      const jobsData = await jobsRes.json();
      
      let filteredJobs = Array.isArray(jobsData) ? jobsData : [];
      const now = new Date().getTime();
      filteredJobs = filteredJobs.filter(job => {
        if (job.status === 'cancelled') {
          const updated = new Date(job.updated_at).getTime();
          return (now - updated) < 15 * 60 * 1000;
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

      const tsRes = await fetch(\`/api/employees/time?date=\${today}\`);
      if (tsRes.ok) {
        const tsData = await tsRes.json();
        if (tsData && tsData.length > 0) {
          setActiveTimesheet(tsData[0]);
        }
      }

      const statsRes = await fetch('/api/employees/me/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          score: statsData.score,
          week_jobs: statsData.week_jobs,
          total_completed: statsData.total_completed
        });
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

  async function handleClockIn() {
    setIsClocking(true);
    try {
      let location_data = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location_data = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
        } catch (e) {
          console.warn('Could not get location', e);
        }
      }

      const res = await fetch('/api/employees/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_data }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to clock in');
      }
      
      toast.success('Clocked in successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsClocking(false);
    }
  }

  async function handleClockOut() {
    setIsClocking(true);
    try {
      const res = await fetch('/api/employees/time/clock-out', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to clock out');
      }
      toast.success('Clocked out successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsClocking(false);
    }
  }

  let hasInsurance = false;
  let hasProfilePhoto = false;
  
  if (employee) {
    const notesStr = employee.notes || '{}';
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
    if (!file || !employee) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = \`\${employee.id}-\${Math.random()}.\${fileExt}\`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
      
      const response = await fetch('/api/employees/me/insurance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: publicUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save insurance document');
      }
      
      toast.success('Insurance document uploaded successfully!');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to upload document: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  async function handleProfilePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = \`avatar-\${employee.id}-\${Math.random()}.\${fileExt}\`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
      
      const response = await fetch('/api/employees/me/photo', {
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

  if (!isClient || (loading && !employee)) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="space-y-4 pt-4">
          <Skeleton className="h-8 w-40" />
          {[1, 2].map(i => <Skeleton key={i} className="h-56 w-full rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-lg mx-auto"
    >
      {/* Premium Hero Header */}
      <motion.div 
        whileHover={{ scale: 0.99 }}
        className="relative overflow-hidden rounded-[2rem] bg-[#0a0a0a] text-white shadow-2xl shadow-black/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent" />
        <div className="absolute top-0 right-0 p-32 bg-blue-500/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 p-32 bg-violet-500/20 blur-[100px] rounded-full" />
        
        <div className="relative z-10 p-8 flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span className="text-xs font-medium tracking-wide text-indigo-100">Portal</span>
            </div>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">
              {isClient ? format(new Date(), 'MMM d, yyyy') : '...'}
            </p>
          </div>
          
          <div className="mt-8">
            <h1 className="text-4xl font-light tracking-tight text-white/90">
              Hello, <span className="font-bold text-white">{employee?.full_name?.split(' ')[0] || ''}</span>
            </h1>
            
            {stats && (
              <p className="text-white/60 text-sm mt-3 font-medium flex items-center gap-2">
                {stats.week_jobs > 0 ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-400" /> {stats.week_jobs} job{stats.week_jobs > 1 ? 's' : ''} completed this week</>
                ) : (
                  <><TrendingUp className="w-4 h-4 text-indigo-400" /> No jobs completed yet</>
                )}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Requirements Reminders */}
      <AnimatePresence>
        {!loading && !isEligible && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {!hasInsurance && (
              <div className="bg-orange-50/50 backdrop-blur-xl border border-orange-200/60 rounded-3xl p-5 shadow-sm">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100/80 flex items-center justify-center shrink-0 shadow-inner text-orange-600">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-orange-900 tracking-tight text-lg">Insurance Required</h3>
                    <p className="text-sm text-orange-800/70 mt-1 leading-snug">
                      Please upload your liability insurance slip to start accepting jobs.
                    </p>
                    <div className="mt-4 relative overflow-hidden rounded-xl">
                      <Input 
                        type="file" 
                        accept="image/*,.pdf" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        onChange={handleInsuranceUpload}
                        disabled={isUploading}
                      />
                      <Button variant="outline" className="w-full bg-white hover:bg-orange-50 border-orange-200 text-orange-700 font-semibold shadow-sm h-12 rounded-xl transition-all" disabled={isUploading}>
                        {isUploading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Uploading...</> : <><UploadCloud className="h-5 w-5 mr-2" /> Upload Document</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!hasProfilePhoto && (
              <div className="bg-blue-50/50 backdrop-blur-xl border border-blue-200/60 rounded-3xl p-5 shadow-sm">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100/80 flex items-center justify-center shrink-0 shadow-inner text-blue-600">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-900 tracking-tight text-lg">Profile Photo Needed</h3>
                    <p className="text-sm text-blue-800/70 mt-1 leading-snug">
                      Upload a clear picture of your face to build trust with customers.
                    </p>
                    <div className="mt-4 relative overflow-hidden rounded-xl">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        onChange={handleProfilePhotoUpload}
                        disabled={isUploading}
                      />
                      <Button variant="outline" className="w-full bg-white hover:bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-sm h-12 rounded-xl transition-all" disabled={isUploading}>
                        {isUploading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Uploading...</> : <><UploadCloud className="h-5 w-5 mr-2" /> Upload Photo</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clock In/Out Widget */}
      {isEligible && !loading && (
        <motion.div 
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="absolute top-0 right-0 p-24 bg-indigo-50 blur-[80px] rounded-full" />
          <div className="p-6 relative z-10 flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-5 w-full sm:w-auto">
              <div className={\`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-inner \${activeTimesheet?.status === 'open' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}\`}>
                <Clock className="h-7 w-7" />
              </div>
              <div>
                {!activeTimesheet ? (
                  <>
                    <h3 className="font-bold text-xl text-slate-900 tracking-tight">Ready to start?</h3>
                    <p className="text-sm text-slate-500 font-medium">Clock in to track hours.</p>
                  </>
                ) : activeTimesheet.status === 'open' ? (
                  <>
                    <h3 className="font-bold text-xl text-green-700 tracking-tight">Clocked In</h3>
                    <p className="text-sm text-green-600/80 font-medium">
                      Started: {format(new Date(activeTimesheet.clock_in_time), 'h:mm a')}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-xl text-slate-900 tracking-tight">Shift Complete</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      Total: {Math.floor(activeTimesheet.total_minutes / 60)}h {activeTimesheet.total_minutes % 60}m
                    </p>
                  </>
                )}
              </div>
            </div>

            {!activeTimesheet ? (
              <Button 
                onClick={handleClockIn} 
                disabled={isClocking}
                className="w-full sm:w-auto px-10 h-14 bg-black hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-black/10 transition-all active:scale-95"
              >
                {isClocking ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Clock In'}
              </Button>
            ) : activeTimesheet.status === 'open' && (
              <Button 
                onClick={handleClockOut} 
                disabled={isClocking}
                variant="outline"
                className="w-full sm:w-auto px-10 h-14 border-slate-200 text-slate-900 hover:bg-slate-50 font-bold rounded-2xl transition-all active:scale-95"
              >
                {isClocking ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Clock Out'}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
              <Star className="h-6 w-6 fill-amber-500/20" />
            </div>
            <p className="text-4xl font-light text-slate-900 tracking-tighter">{stats.score.toFixed(1)}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Rating</p>
          </motion.div>
          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-4xl font-light text-slate-900 tracking-tighter">{stats.week_jobs}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Jobs this Week</p>
          </motion.div>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/employee/jobs" className="flex-1">
          <Button variant="outline" className="w-full h-14 text-sm font-semibold rounded-2xl border-slate-200 hover:bg-slate-50">
            <Briefcase className="h-4 w-4 mr-2 text-slate-400" />
            All Jobs
          </Button>
        </Link>
        <Link href="/employee/timesheets" className="flex-1">
          <Button variant="outline" className="w-full h-14 text-sm font-semibold rounded-2xl border-slate-200 hover:bg-slate-50">
            <Clock className="h-4 w-4 mr-2 text-slate-400" />
            Timesheets
          </Button>
        </Link>
      </div>

      {/* Today's Jobs */}
      {isEligible && (
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2 px-1">
            <CalendarDays className="h-5 w-5 text-indigo-500" /> Today's Schedule
          </h2>
          
          {todaysJobs.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <Briefcase className="h-8 w-8" />
              </div>
              <p className="font-semibold text-slate-700 text-lg">No jobs scheduled.</p>
              <p className="text-sm text-slate-500 mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaysJobs.map((job, idx) => {
                const scope = buildScopeSummary(job);
                const isActive = ['on_the_way', 'in_progress'].includes(job.status);
                
                return (
                  <motion.div 
                    key={job.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link href={\`/employee/jobs/\${job.id}\`}>
                      <div className={\`group relative overflow-hidden bg-white rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 \${
                        isActive 
                          ? 'border-2 border-green-500 shadow-lg shadow-green-500/10' 
                          : 'border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]'
                      }\`}>
                        {isActive && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 blur-[50px] rounded-full" />
                        )}
                        
                        <div className="flex justify-between items-start mb-5 relative z-10">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-slate-900 text-white hover:bg-slate-800 px-3 py-1 text-xs rounded-full font-bold">
                                {TIME_WINDOW_LABELS[job.scheduled_window]}
                              </Badge>
                              <StatusBadge status={job.status} />
                            </div>
                            <h3 className="font-bold text-xl text-slate-900 tracking-tight leading-none mt-2">
                              {SERVICE_TYPE_LABELS[job.service_type]}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 pt-1">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {job.address_line1}, {job.city}
                            </p>
                          </div>
                          
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 relative z-10 border border-slate-100">
                          <div className="flex flex-wrap gap-2">
                            {scope.map((item, i) => (
                              <span key={i} className="text-xs bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-full font-semibold shadow-sm">
                                {item}
                              </span>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
                            {job.estimated_duration_minutes && (
                              <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                                <Timer className="h-4 w-4 text-slate-400" /> 
                                {Math.floor(job.estimated_duration_minutes / 60)}h {job.estimated_duration_minutes % 60}m
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                              <Package className="h-4 w-4 text-slate-400" /> 
                              {job.service_type.includes('deep') || job.service_type.includes('move') ? 'Heavy-Duty Kit' : 'Standard Kit'}
                            </div>
                          </div>
                        </div>
                        
                        {isActive && (
                          <div className="mt-4 flex items-center justify-between text-green-600 bg-green-50 rounded-xl p-3 font-bold text-sm relative z-10">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                              Active Job In Progress
                            </div>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
`;

fs.writeFileSync(path.join('/Users/malikcampbell/SeaOfBlue/app/employee/page.tsx'), fileContent);
console.log("Rewrite complete.");
