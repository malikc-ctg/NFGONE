'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Briefcase, DollarSign, CalendarDays,
  Clock, CheckCircle2, ChevronRight, Timer, Package, Key, Info,
  Loader2
} from 'lucide-react';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';

export default function EmployeeJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      // The backend API is now secured to only return jobs assigned to this employee
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load jobs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const upcomingJobs = jobs.filter(j => ['assigned', 'accepted', 'on_the_way', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter(j => ['completed', 'reviewed', 'paid_out', 'disputed'].includes(j.status));

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function renderJobCard(job: Job) {
    return (
      <Link key={job.id} href={`/employee/jobs/${job.id}`}>
        <Card className="hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer overflow-hidden border border-border shadow-sm group">
          <div className="bg-slate-50/50 dark:bg-slate-900/20 px-4 py-3 flex items-center justify-between border-b border-border">
            <div className="flex flex-col">
              <span className="font-bold text-sm text-foreground">{SERVICE_TYPE_LABELS[job.service_type]}</span>
              <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">{format(new Date(job.scheduled_date + 'T12:00:00'), 'EEEE, MMM d, yyyy')}</span>
            </div>
            <StatusBadge status={job.status} />
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{job.address_line1}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{job.city}, {job.postal_code}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/50 dark:bg-slate-900/20 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{TIME_WINDOW_LABELS[job.scheduled_window]}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end text-green-600 dark:text-green-400">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="font-bold">${(job.quoted_price * 0.7).toFixed(0)}</span>
              </div>
            </div>
            
            <div className="pt-2 flex items-center justify-between border-t border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Job ID: {job.job_number}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight drop-shadow-sm">My Jobs</h1>
        <p className="text-xs text-muted-foreground mt-1">View and manage all your assigned and completed jobs.</p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="upcoming" className="text-xs font-bold uppercase tracking-wider">Upcoming ({upcomingJobs.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-bold uppercase tracking-wider">Completed ({completedJobs.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingJobs.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-border">
              <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-bold text-sm text-foreground">No upcoming jobs</h3>
              <p className="text-xs text-muted-foreground mt-1">Accept offers on the dashboard to fill your schedule.</p>
            </div>
          ) : (
            upcomingJobs.map(renderJobCard)
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedJobs.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-border">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-bold text-sm text-foreground">No completed jobs yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Your completed jobs will appear here.</p>
            </div>
          ) : (
            completedJobs.map(renderJobCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
