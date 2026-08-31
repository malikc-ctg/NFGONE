'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, LogIn, LogOut, History, Timer } from 'lucide-react';
import type { EmployeeTimeEntry } from '@/types';
import { format, formatDistanceStrict, intervalToDuration } from 'date-fns';
import { toast } from 'sonner';

function formatElapsed(startIso: string, now: Date): string {
  const duration = intervalToDuration({ start: new Date(startIso), end: now });
  const hours = (duration.days || 0) * 24 + (duration.hours || 0);
  const minutes = duration.minutes || 0;
  const seconds = duration.seconds || 0;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function TimeClockPage() {
  const [entries, setEntries] = useState<EmployeeTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeEntry = entries.find(e => !e.clock_out) || null;

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/employees/me/time-entries');
      if (!res.ok) throw new Error('Failed to load time entries');
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (activeEntry) {
      tickRef.current = setInterval(() => setNow(new Date()), 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [activeEntry?.id]);

  async function handleClockIn() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/employees/me/time-entries', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clock in');
      toast.success("Clocked in — have a great shift!");
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClockOut() {
    if (!activeEntry) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employees/me/time-entries/${activeEntry.id}`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clock out');
      toast.success('Clocked out. Nice work!');
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Time Clock</h1>
        <p className="text-sm text-muted-foreground">Clock in and out to track your shifts.</p>
      </div>

      <Card className={`border-0 shadow-lg overflow-hidden relative text-white ${
        activeEntry
          ? 'bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 shadow-emerald-500/20'
          : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-slate-500/20'
      }`}>
        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Clock className="h-7 w-7" />
          </div>

          {activeEntry ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-white/80">Clocked in since</p>
                <p className="text-lg font-semibold">{format(new Date(activeEntry.clock_in), 'h:mm a, MMM d')}</p>
              </div>
              <div className="flex items-center gap-2 font-mono text-3xl font-black tabular-nums">
                <Timer className="h-6 w-6 opacity-80" />
                {formatElapsed(activeEntry.clock_in, now)}
              </div>
              <Button
                onClick={handleClockOut}
                disabled={submitting}
                className="w-full h-12 bg-white text-emerald-700 hover:bg-white/90 font-bold"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {submitting ? 'Clocking Out...' : 'Clock Out'}
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-white/70">Status</p>
                <p className="text-lg font-semibold">Not clocked in</p>
              </div>
              <Button
                onClick={handleClockIn}
                disabled={submitting}
                className="w-full h-12 bg-white text-slate-800 hover:bg-white/90 font-bold"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {submitting ? 'Clocking In...' : 'Clock In'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <History className="h-4 w-4" /> Recent Shifts
        </h2>

        {entries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center space-y-2">
              <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">No shifts logged yet</p>
              <p className="text-xs text-muted-foreground">Clock in above to start tracking your time.</p>
            </CardContent>
          </Card>
        ) : (
          entries.map(entry => (
            <Card key={entry.id} className={!entry.clock_out ? 'border-l-4 border-l-emerald-500' : undefined}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{format(new Date(entry.clock_in), 'EEEE, MMM d')}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.clock_in), 'h:mm a')}
                    {' – '}
                    {entry.clock_out ? format(new Date(entry.clock_out), 'h:mm a') : 'In progress'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {entry.clock_out
                      ? formatDistanceStrict(new Date(entry.clock_out), new Date(entry.clock_in))
                      : formatElapsed(entry.clock_in, now)}
                  </p>
                  {!entry.clock_out && (
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Active</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
