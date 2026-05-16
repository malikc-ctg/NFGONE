'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Briefcase, Star, ArrowUpRight, Clock } from 'lucide-react';
import { SERVICE_TYPE_LABELS } from '@/types';
import { toast } from 'sonner';

interface EarningsSummary {
  total_earned: number;
  pending_payout: number;
  total_paid: number;
  total_jobs: number;
}

interface EarningsJob {
  id: string;
  job_number: string;
  service_type: string;
  scheduled_date: string;
  city: string;
  payout: number;
  status: string;
}

interface WeeklyBreakdown {
  week: string;
  earnings: number;
  jobs: number;
}

interface PayoutRecord {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  paid_at: string | null;
  created_at: string;
}

export default function EarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [jobs, setJobs] = useState<EarningsJob[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [weekly, setWeekly] = useState<WeeklyBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ score: number; total_completed: number } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [earningsRes, statsRes] = await Promise.all([
          fetch('/api/contractors/me/earnings?period=all'),
          fetch('/api/contractors/me/stats'),
        ]);

        if (earningsRes.ok) {
          const data = await earningsRes.json();
          setSummary(data.summary);
          setJobs(data.jobs || []);
          setPayouts(data.payouts || []);
          setWeekly(data.weekly_breakdown || []);
        }

        if (statsRes.ok) {
          const sData = await statsRes.json();
          setStats({ score: sData.score, total_completed: sData.total_completed });
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load earnings');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const maxWeekly = Math.max(...weekly.map(w => w.earnings), 1);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Earnings</h1>
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-green-600" /> Earnings
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border-green-100 dark:border-green-900/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-green-700 dark:text-green-400">${summary?.total_earned || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Earned</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-100 dark:border-amber-900/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400">${summary?.pending_payout || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats?.total_completed || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Jobs Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats?.score || '5.0'}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      {weekly.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Weekly Earnings</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-end gap-1.5 h-28">
              {weekly.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground font-bold">
                    {w.earnings > 0 ? `$${w.earnings}` : ''}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 transition-all duration-500"
                    style={{
                      height: `${Math.max((w.earnings / maxWeekly) * 80, 4)}px`,
                      opacity: w.earnings > 0 ? 1 : 0.2,
                    }}
                  />
                  <span className="text-[8px] text-muted-foreground font-medium">{w.week}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Job History & Payouts */}
      <Tabs defaultValue="jobs">
        <TabsList className="w-full">
          <TabsTrigger value="jobs" className="flex-1 h-10">Job History</TabsTrigger>
          <TabsTrigger value="payouts" className="flex-1 h-10">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-2 mt-3">
          {jobs.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No completed jobs yet</CardContent></Card>
          ) : (
            jobs.map(job => (
              <Card key={job.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">{SERVICE_TYPE_LABELS[job.service_type as keyof typeof SERVICE_TYPE_LABELS] || job.service_type}</p>
                    <p className="text-[10px] text-muted-foreground">{job.scheduled_date} · {job.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-0.5">
                      <ArrowUpRight className="h-3 w-3" />${job.payout}
                    </p>
                    <Badge className={`text-[9px] px-1.5 py-0 border-0 ${statusColor[job.status] || 'bg-muted text-muted-foreground'}`}>
                      {job.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-2 mt-3">
          {payouts.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No payouts yet</CardContent></Card>
          ) : (
            payouts.map(p => (
              <Card key={p.id}>
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">${p.amount}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={`text-[9px] px-1.5 py-0 border-0 ${statusColor[p.status] || 'bg-muted'}`}>
                    {p.payout_method} · {p.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
