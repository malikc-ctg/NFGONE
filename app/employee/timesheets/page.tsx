'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar as CalendarIcon, ArrowLeft, Timer, Coffee, CheckCircle2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TimesheetsPage() {
  const router = useRouter();
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTimesheets() {
      try {
        const res = await fetch('/api/employees/time');
        if (res.ok) {
          const data = await res.json();
          setTimesheets(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTimesheets();
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

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Calculate current pay period (this week: Mon-Sun) total minutes
  const currentPeriodMinutes = timesheets.reduce((sum, ts) => {
    try {
      const tsDate = new Date(ts.work_date + 'T12:00:00');
      if (isWithinInterval(tsDate, { start: currentWeekStart, end: currentWeekEnd })) {
        return sum + (ts.total_minutes || 0);
      }
    } catch {
      // ignore date parse errors
    }
    return sum;
  }, 0);

  const currentPeriodHours = Math.floor(currentPeriodMinutes / 60);
  const currentPeriodRemainderMins = currentPeriodMinutes % 60;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">My Timesheets</h1>
      </div>

      {/* Pay Period Summary Banner */}
      <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-0 shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] text-indigo-200 border-indigo-400/40 bg-indigo-950/50 uppercase tracking-wider font-semibold">
                  Current Pay Period
                </Badge>
              </div>
              <p className="text-xs text-indigo-200 font-medium mt-1">
                {format(currentWeekStart, 'MMM d')} – {format(currentWeekEnd, 'MMM d, yyyy')} (Mon–Sun)
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-white">
                {currentPeriodHours}h {currentPeriodRemainderMins}m
              </span>
              <span className="text-xs text-indigo-200 font-medium">logged</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {timesheets.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-10 text-center space-y-2">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-muted-foreground">No timesheets found.</p>
            <p className="text-xs text-muted-foreground">Your daily clock-ins will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {timesheets.map((ts) => (
            <Card key={ts.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <CalendarIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{format(new Date(ts.work_date + 'T12:00:00'), 'EEEE, MMM do')}</p>
                      <p className="text-xs text-muted-foreground">
                        {ts.status === 'open' ? (
                          <span className="text-green-600 font-medium">Currently Clocked In</span>
                        ) : (
                          <span>Status: {ts.status}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {ts.total_minutes != null && (
                    <div className="text-right">
                      <p className="text-lg font-black text-indigo-700">
                        {Math.floor(ts.total_minutes / 60)}h {ts.total_minutes % 60}m
                      </p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Total</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Clock In</p>
                    <p className="text-sm font-medium">
                      {ts.clock_in_time ? format(new Date(ts.clock_in_time), 'h:mm a') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Clock Out</p>
                    <p className="text-sm font-medium">
                      {ts.clock_out_time ? format(new Date(ts.clock_out_time), 'h:mm a') : '—'}
                    </p>
                  </div>
                </div>

                {ts.location_data?.breaks?.length > 0 && (
                  <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
                    <Coffee className="h-3.5 w-3.5 text-amber-600" />
                    <span>
                      {ts.location_data.breaks.length} break{ts.location_data.breaks.length > 1 ? 's' : ''} taken 
                      ({ts.location_data.breaks.reduce((s: number, b: any) => s + (b.duration_minutes || 0), 0)}m total)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
