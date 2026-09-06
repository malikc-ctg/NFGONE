'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job } from '@/types';

export default function SchedulePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const meRes = await fetch('/api/employees/me');
        if (!meRes.ok) throw new Error();
        const me = await meRes.json();

        // Get jobs from today onwards for the next 14 days
        const today = new Date();
        const endDate = addDays(today, 14);
        
        const jobsRes = await fetch(`/api/jobs?start_date=${format(today, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}&employee_id=${me.id}`);
        if (jobsRes.ok) {
          const data = await jobsRes.json();
          // Filter out cancelled jobs older than 15 mins
          const now = Date.now();
          const validJobs = data.filter((j: any) => {
             if (j.status === 'cancelled') {
               return (now - new Date(j.updated_at).getTime()) < 15 * 60 * 1000;
             }
             return true;
          });
          // Sort by date then window
          validJobs.sort((a: any, b: any) => {
            const dateA = new Date(a.scheduled_date).getTime();
            const dateB = new Date(b.scheduled_date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.scheduled_window.localeCompare(b.scheduled_window);
          });
          setJobs(validJobs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Group by date
  const groupedJobs: Record<string, Job[]> = {};
  jobs.forEach(job => {
    if (!groupedJobs[job.scheduled_date]) groupedJobs[job.scheduled_date] = [];
    groupedJobs[job.scheduled_date].push(job);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Upcoming Schedule</h1>
      </div>

      {Object.keys(groupedJobs).length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-10 text-center space-y-2">
            <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-muted-foreground">Your schedule is empty.</p>
            <p className="text-xs text-muted-foreground">You have no upcoming jobs assigned.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedJobs).map(([date, dayJobs]) => (
          <div key={date} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider sticky top-14 bg-background/95 backdrop-blur-sm py-2 z-10">
              {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM do')}
            </h2>
            <div className="space-y-3">
              {dayJobs.map(job => (
                <Card key={job.id} className="overflow-hidden hover:border-indigo-300 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                            {TIME_WINDOW_LABELS[job.scheduled_window]}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-slate-50 uppercase">
                            {job.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="font-bold text-base leading-tight mt-1">{SERVICE_TYPE_LABELS[job.service_type]}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{job.address_line1}, {job.city}</span>
                      </div>
                      {job.estimated_duration_minutes && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Est. {Math.floor(job.estimated_duration_minutes / 60)}h {job.estimated_duration_minutes % 60}m</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
