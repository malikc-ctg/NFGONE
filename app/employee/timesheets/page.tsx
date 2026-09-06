'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">My Timesheets</h1>
      </div>

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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
