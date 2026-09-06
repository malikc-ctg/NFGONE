'use client';

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
  MapPin, Briefcase, Star, TrendingUp,
  Clock, CheckCircle2, ArrowRight, CalendarDays,
  Sparkles, ChevronRight, Timer, Package,
  Loader2, Coffee, Play
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
  approx_hours: number;
}

function buildScopeSummary(job: Job): string[] {
  const items: string[] = [];
  items.push('Kitchen');
  if (job.home_bathrooms) items.push(`${job.home_bathrooms} Bath`);
  if (job.home_bedrooms) items.push(`${job.home_bedrooms} Bed`);
  items.push('Living Areas');
  if (job.add_ons?.length) {
    job.add_ons.forEach(a => items.push(a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())));
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
  const [isBreaking, setIsBreaking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/employees/me');
      if (!meRes.ok) {
        if (meRes.status === 401) {
          router.push('/employee/login');
          return;
        }
        const errorData = await meRes.json();
        throw new Error(errorData.error || 'Could not fetch profile');
      }
      const meData = await meRes.json();
      setEmployee(meData);

      const today = format(new Date(), 'yyyy-MM-dd');
      const jobsRes = await fetch(`/api/jobs?date=${today}&employee_id=${meData.id}`);
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

      const tsRes = await fetch(`/api/employees/time?date=${today}`);
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
          total_completed: statsData.total_completed,
          approx_hours: statsData.approx_hours ?? statsData.week_hours ?? 0,
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

  // Live shift timer interval
  useEffect(() => {
    if (!activeTimesheet || activeTimesheet.status !== 'open' || !activeTimesheet.clock_in_time) {
      setElapsedSeconds(0);
      return;
    }

    const clockInMs = new Date(activeTimesheet.clock_in_time).getTime();
    const breaks = activeTimesheet.location_data?.breaks || [];

    function updateTimer() {
      const now = Date.now();
      let breakSeconds = 0;
      for (const b of breaks) {
        const bStart = new Date(b.start).getTime();
        const bEnd = b.end ? new Date(b.end).getTime() : now;
        breakSeconds += Math.max(0, Math.floor((bEnd - bStart) / 1000));
      }
      const totalShiftSeconds = Math.max(0, Math.floor((now - clockInMs) / 1000));
      setElapsedSeconds(Math.max(0, totalShiftSeconds - breakSeconds));
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTimesheet]);

  const activeBreaks = activeTimesheet?.location_data?.breaks || [];
  const isOnBreak = activeTimesheet?.status === 'open' && activeBreaks.some((b: any) => !b.end);

  async function handleToggleBreak() {
    setIsBreaking(true);
    try {
      const res = await fetch('/api/employees/time/break', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update break status');
      }
      const data = await res.json();
      setActiveTimesheet(data.timesheet);
      toast.success(data.isOnBreak ? 'Break started — relax!' : 'Break ended — welcome back!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsBreaking(false);
    }
  }

  function formatStopwatch(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async function handleClockIn() {
    setIsClocking(true);
    try {
      const res = await fetch('/api/employees/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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



  if (!isClient || (loading && !employee)) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-4 pt-4">
          <Skeleton className="h-6 w-32" />
          {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
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
      {/* Hero Header */}
      <div className="py-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hello, {employee?.full_name?.split(' ')[0] || ''}
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isClient ? format(new Date(), 'EEEE, MMMM do, yyyy') : '...'}
        </p>
      </div>

      {/* Clock In/Out Widget */}
      {!loading && (
        <div className={`border rounded-xl bg-white transition-all ${
          isOnBreak 
            ? 'border-amber-300 ring-1 ring-amber-300' 
            : activeTimesheet?.status === 'open' 
              ? 'border-green-400 ring-1 ring-green-400' 
              : 'border-slate-200'
        }`}>
          <div className="p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div>
                {!activeTimesheet ? (
                  <>
                    <h3 className="font-bold text-lg text-slate-900 tracking-tight">Ready to start?</h3>
                    <p className="text-sm text-slate-500">Clock in to track your shift hours.</p>
                  </>
                ) : activeTimesheet.status === 'open' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnBreak ? 'bg-amber-400' : 'bg-green-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnBreak ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                      </span>
                      <h3 className={`font-bold text-lg tracking-tight ${isOnBreak ? 'text-amber-700' : 'text-green-700'}`}>
                        {isOnBreak ? 'On Break' : 'Clocked In'}
                      </h3>
                      <Badge variant="outline" className={`font-mono font-bold text-xs ${
                        isOnBreak ? 'border-amber-300 text-amber-800 bg-amber-50' : 'border-green-300 text-green-800 bg-green-50'
                      }`}>
                        {formatStopwatch(elapsedSeconds)}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Started: {format(new Date(activeTimesheet.clock_in_time), 'h:mm a')} 
                      {activeBreaks.length > 0 && ` • ${activeBreaks.length} break${activeBreaks.length > 1 ? 's' : ''}`}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-lg text-slate-900 tracking-tight">Shift Complete</h3>
                    <p className="text-sm text-slate-500">Total: {Math.floor(activeTimesheet.total_minutes / 60)}h {activeTimesheet.total_minutes % 60}m</p>
                  </>
                )}
              </div>
            </div>

            {!activeTimesheet ? (
              <Button 
                onClick={handleClockIn} 
                disabled={isClocking}
                className="w-full sm:w-auto"
              >
                {isClocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                Clock In
              </Button>
            ) : activeTimesheet.status === 'open' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  onClick={handleToggleBreak} 
                  disabled={isBreaking || isClocking}
                  variant={isOnBreak ? "default" : "outline"}
                  className={`flex-1 sm:flex-none text-xs font-semibold ${
                    isOnBreak ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-slate-300'
                  }`}
                >
                  {isBreaking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : isOnBreak ? (
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                  ) : (
                    <Coffee className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {isOnBreak ? 'Resume Shift' : 'Take Break'}
                </Button>

                <Button 
                  onClick={handleClockOut} 
                  disabled={isClocking || isBreaking}
                  variant="outline"
                  className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-semibold"
                >
                  {isClocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Clock Out
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col items-center justify-center text-center">
            <p className="text-xl font-bold text-slate-900">{stats.approx_hours}h</p>
            <p className="text-[11px] text-slate-500 font-medium">Approx Hours</p>
          </div>
          <div className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col items-center justify-center text-center">
            <p className="text-xl font-bold text-slate-900">{stats.week_jobs}</p>
            <p className="text-[11px] text-slate-500 font-medium">Jobs this Week</p>
          </div>
          <div className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col items-center justify-center text-center">
            <p className="text-xl font-bold text-slate-900">{stats.score.toFixed(1)}</p>
            <p className="text-[11px] text-slate-500 font-medium">Rating</p>
          </div>
        </div>
      )}



      {/* Today's Jobs */}
      <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2 px-1">
            <CalendarDays className="h-5 w-5 text-indigo-500" /> Today's Schedule
          </h2>
          
          {todaysJobs.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 text-slate-500">
              <p className="font-medium">No jobs scheduled.</p>
              <p className="text-sm mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaysJobs.map((job, idx) => {
                const scope = buildScopeSummary(job);
                const isActive = ['on_the_way', 'in_progress'].includes(job.status);
                
                return (
                  <div key={job.id} className="pt-2">
                    <Link href={`/employee/jobs/${job.id}`}>
                      <div className={`group border rounded-xl p-4 bg-white hover:border-slate-300 transition-colors ${
                        isActive ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-200'
                      }`}>
                        
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs font-semibold">
                                {TIME_WINDOW_LABELS[job.scheduled_window]}
                              </Badge>
                              <StatusBadge status={job.status} />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                              {SERVICE_TYPE_LABELS[job.service_type]}
                            </h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {job.address_line1}, {job.city}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {scope.map((item, i) => (
                              <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-medium">
                                {item}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs font-medium pt-2 border-t border-slate-200">
                            {job.estimated_duration_minutes && (
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" /> 
                                {Math.floor(job.estimated_duration_minutes / 60)}h {job.estimated_duration_minutes % 60}m
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" /> 
                              {job.service_type.includes('deep') || job.service_type.includes('move') ? 'Heavy-Duty Kit' : 'Standard Kit'}
                            </span>
                          </div>
                        </div>
                        
                        {isActive && (
                          <div className="mt-3 text-green-700 bg-green-50 rounded-md p-2 text-xs font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                              Active Job
                            </span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </motion.div>
  );
}
