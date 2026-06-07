'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, BarChart3, RefreshCw } from 'lucide-react';
import type { ZoneMonthlyPnl, Zone, ZoneExpansionScore } from '@/types';
import { format } from 'date-fns';

function formatCAD(val: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val);
}

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% MoM
        </div>
      )}
    </div>
  );
}

function ExpansionBadge({ score }: { score: ZoneExpansionScore }) {
  const color = score.score >= 70 ? 'bg-green-100 text-green-800 border-green-200'
    : score.score >= 40 ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {score.ready ? '✓ Ready' : `${score.score}/100`}
    </span>
  );
}

export default function FinancePage() {
  const [tab, setTab] = useState<'overview' | 'forecast'>('overview');
  const [pnl, setPnl] = useState<ZoneMonthlyPnl[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<{
    forecast: Array<{ month: string; projected_revenue: number; projected_jobs: number; projected_profit: number }>;
    break_even_jobs: number | null;
    expansion_score: ZoneExpansionScore | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/zones').then(r => r.json()).then((data) => setZones(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = selectedZone ? `/api/finance/pnl?zone_id=${selectedZone}` : '/api/finance/pnl';
    fetch(url)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
        return data;
      })
      .then((data) => { setPnl(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [selectedZone, refreshKey]);

  useEffect(() => {
    if (selectedZone && tab === 'forecast') {
      fetch(`/api/finance/forecast?zone_id=${selectedZone}`).then(r => r.json()).then(setForecast);
    }
  }, [selectedZone, tab]);

  // Group by zone for overview table
  const zoneMap = new Map<string, ZoneMonthlyPnl[]>();
  for (const row of pnl) {
    const arr = zoneMap.get(row.zone_id) ?? [];
    arr.push(row);
    zoneMap.set(row.zone_id, arr);
  }

  const latestByZone = Array.from(zoneMap.entries()).map(([, rows]) => rows[0]);
  const totalRevenue = latestByZone.reduce((s, r) => s + r.gross_revenue, 0);
  const totalProfit = latestByZone.reduce((s, r) => s + r.gross_profit, 0);
  const totalJobs = latestByZone.reduce((s, r) => s + r.jobs_completed, 0);
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Per-zone P&amp;L, forecasting, and expansion readiness</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border border-border rounded-lg px-3 py-2 bg-background"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
          >
            <option value="">All zones</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
            title="Refresh P&L data"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {(['overview', 'forecast'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
              <strong>Could not load finance data:</strong> {error}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Monthly Revenue" value={formatCAD(totalRevenue)} sub="This month across all zones" />
            <StatCard label="Gross Profit" value={formatCAD(totalProfit)} sub={`${(avgMargin * 100).toFixed(0)}% margin`} />
            <StatCard label="Jobs Completed" value={totalJobs.toString()} sub="This month" />
            <StatCard label="Avg Ticket" value={formatCAD(totalJobs > 0 ? totalRevenue / totalJobs : 0)} sub="Per completed job" />
          </div>

          {/* Zone P&L table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Zone P&amp;L — Current Month</h2>
              <span className="text-xs text-muted-foreground ml-auto">Refreshed nightly</span>
            </div>
            {loading ? (
              <div className="p-12 text-center text-muted-foreground text-sm">Loading P&amp;L data…</div>
            ) : error ? (
              <div className="p-12 text-center text-red-500 text-sm">Failed to load data. Click refresh to retry.</div>
            ) : latestByZone.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">No data yet. The view refreshes nightly after jobs are completed.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Zone</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Jobs</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Payouts</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Profit</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Margin</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Avg Ticket</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Recurring</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestByZone.map((row) => {
                      const margin = row.gross_revenue > 0 ? row.gross_profit / row.gross_revenue : 0;
                      const recurringPct = row.jobs_completed > 0 ? row.recurring_jobs / row.jobs_completed : 0;
                      return (
                        <tr key={row.zone_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-3.5 font-medium text-foreground">
                            {(row.zone as Zone | undefined)?.name ?? row.zone_id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground">{row.jobs_completed}</td>
                          <td className="px-4 py-3.5 text-right font-medium">{formatCAD(row.gross_revenue)}</td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground">{formatCAD(row.total_contractor_payouts)}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-green-700">{formatCAD(row.gross_profit)}</td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${margin >= 0.3 ? 'bg-green-100 text-green-700' : margin >= 0.2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {(margin * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground">{formatCAD(row.avg_ticket)}</td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground">{(recurringPct * 100).toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-6 py-3 text-foreground">Total</td>
                      <td className="px-4 py-3 text-right">{totalJobs}</td>
                      <td className="px-4 py-3 text-right">{formatCAD(totalRevenue)}</td>
                      <td className="px-4 py-3 text-right">{formatCAD(latestByZone.reduce((s, r) => s + r.total_contractor_payouts, 0))}</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatCAD(totalProfit)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                          {(avgMargin * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCAD(totalJobs > 0 ? totalRevenue / totalJobs : 0)}</td>
                      <td className="px-4 py-3 text-right">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'forecast' && (
        <div className="space-y-6">
          {!selectedZone ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800 text-sm">
              Select a zone from the dropdown above to view forecasts and expansion readiness.
            </div>
          ) : !forecast ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading forecast…</div>
          ) : (
            <>
              {/* 3-month projection */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-semibold text-sm">3-Month Revenue Projection</h2>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  {forecast.forecast.map((m) => (
                    <div key={m.month} className="p-6 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{format(new Date(m.month + '-01'), 'MMMM yyyy')}</p>
                      <p className="text-2xl font-bold">{formatCAD(m.projected_revenue)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.projected_jobs} jobs · {formatCAD(m.projected_profit)} profit</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Break-even and readiness */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Break-Even Calculator</h3>
                  </div>
                  <p className="text-3xl font-bold">{forecast.break_even_jobs ?? '—'}</p>
                  <p className="text-sm text-muted-foreground mt-1">jobs/month needed at current economics</p>
                  <p className="text-xs text-muted-foreground mt-3">Assumes $2,000/month zone operational costs</p>
                </div>

                {forecast.expansion_score && (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm">Expansion Readiness</h3>
                      </div>
                      <ExpansionBadge score={forecast.expansion_score} />
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Jobs/month', value: forecast.expansion_score.jobs_per_month },
                        { label: 'Active contractors', value: forecast.expansion_score.contractor_count },
                        { label: 'Recurring rate', value: `${forecast.expansion_score.recurring_rate}%` },
                        { label: 'Avg ticket', value: formatCAD(forecast.expansion_score.avg_ticket) },
                        { label: 'Net margin', value: `${forecast.expansion_score.net_margin}%` },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-medium">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Readiness score</span>
                        <span>{forecast.expansion_score.score}/100</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            forecast.expansion_score.score >= 70 ? 'bg-green-500'
                            : forecast.expansion_score.score >= 40 ? 'bg-amber-500'
                            : 'bg-red-500'
                          }`}
                          style={{ width: `${forecast.expansion_score.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
