'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@/lib/supabase/client';
import {
  Search, RefreshCw, Radio, Briefcase,
  DollarSign, Zap, AlertTriangle, CheckCircle,
  Users, Home, GitBranch, Map, List,
  TrendingUp, TrendingDown, Minus, ChevronRight, ChevronLeft,
  Flame, Layers, Clock, Cloud, CloudRain, CloudSnow,
  CloudLightning, Sun, Wind, X, Navigation, UserCheck, Car, Sparkles, Phone,
} from 'lucide-react';

// ─── Color Config ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  lead_received: '#f97316', quoted: '#fb923c',
  confirmed: '#3b82f6',    offered: '#3b82f6',
  assigned: '#eab308',     on_the_way: '#8b5cf6',
  in_progress: '#8b5cf6',  completed: '#22c55e',
  disputed: '#ef4444',     refunded: '#ef4444',
  cancelled: '#6b7280',    default: '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  lead_received: 'Lead', quoted: 'Quoted', confirmed: 'Confirmed',
  offered: 'Offered', assigned: 'Assigned', on_the_way: 'En Route',
  in_progress: 'In Progress', completed: 'Completed',
  disputed: 'Disputed', refunded: 'Refunded', cancelled: 'Cancelled',
};

const COVERAGE_COLORS: Record<string, string> = {
  high: '#22c55e', medium: '#eab308', low: '#ef4444', idle: '#475569',
};

const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ZoneMetric {
  zone_id: string;
  name: string;
  city: string;
  total_jobs_today: number;
  active_jobs: number;
  completed_jobs: number;
  total_revenue: number;
  active_revenue: number;
  total_employees: number;
  online_employees: number;
  assigned_jobs: number;
  coverage_status: 'high' | 'medium' | 'low' | 'idle';
  in_house_employees: number;
  independent_employees: number;
  in_house_jobs_today: number;
  employee_jobs_today: number;
  dominance_mode: 'in_house' | 'employee' | 'mixed' | 'none';
}

interface FilterState {
  status: string;
  shift: 'all' | 'morning' | 'afternoon' | 'night';
  search: string;
  showJobs: boolean;
  showEmployees: boolean;
  showHQs: boolean;
  showZones: boolean;
  showLines: boolean;
  showHeatmap: boolean;
  showActivityDots: boolean;
}

interface MapData {
  jobs: any[];
  employeeLocations: any[];
  employeeHQs: any[];
  zoneMetrics: ZoneMetric[];
  assignmentLines: any[];
}

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  condition: {
    label: string;
    icon: string;
    impact: 'normal' | 'caution' | 'severe';
    alertMessage?: string;
  };
}

interface Props { onBack: () => void; }

// ─── Keyframes Injection ───────────────────────────────────────────────────────
const STYLES_INJECTION = `
@keyframes sonarWave {
  0% { transform: scale(0.85); opacity: 0.8; }
  50% { transform: scale(1.6); opacity: 0.3; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.6); }
  50% { box-shadow: 0 0 20px rgba(34,197,94,0.95); }
}
@keyframes alertPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 6px #ef4444; }
  50% { transform: scale(1.15); box-shadow: 0 0 16px #ef4444; }
}
`;

// ─── Marker Factories ──────────────────────────────────────────────────────────
function mkJobMarker(job: any, isAtRisk: boolean, onSelect: () => void) {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;';

  const status = job.status;
  const isEnRoute = status === 'on_the_way';
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.default;

  // Radar ripple if en-route or at-risk
  if (isAtRisk) {
    const alertRing = document.createElement('div');
    alertRing.style.cssText = 'position:absolute;inset:-6px;border-radius:50%;border:2px solid #ef4444;opacity:0.8;animation:sonarWave 1.8s cubic-bezier(0,0.2,0.8,1) infinite;pointer-events:none;';
    el.appendChild(alertRing);
  } else if (isEnRoute) {
    const enRouteRing = document.createElement('div');
    enRouteRing.style.cssText = 'position:absolute;inset:-6px;border-radius:50%;border:1.5px solid #8b5cf6;opacity:0.75;animation:sonarWave 2.2s cubic-bezier(0,0.2,0.8,1) infinite;pointer-events:none;';
    el.appendChild(enRouteRing);
  }

  const inner = document.createElement('div');
  inner.style.cssText = `position:relative;z-index:2;width:18px;height:18px;background:${c};border:2px solid rgba(255,255,255,0.95);border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.6);transition:transform .15s ease;`;
  el.appendChild(inner);

  el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.35)'; });
  el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onSelect();
  });
  return el;
}

function mkEmployeeMarker(cleaner: any) {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;';

  // Double concentric radar ripples for that alive command center feel
  const ring1 = document.createElement('div');
  ring1.style.cssText = 'position:absolute;inset:-6px;border-radius:50%;border:1.5px solid #22c55e;opacity:0.6;animation:sonarWave 2.4s cubic-bezier(0,0.2,0.8,1) infinite;pointer-events:none;';
  el.appendChild(ring1);

  const ring2 = document.createElement('div');
  ring2.style.cssText = 'position:absolute;inset:-6px;border-radius:50%;border:1px solid #10b981;opacity:0.35;animation:sonarWave 2.4s cubic-bezier(0,0.2,0.8,1) 1.2s infinite;pointer-events:none;';
  el.appendChild(ring2);

  const inner = document.createElement('div');
  inner.style.cssText = 'position:relative;z-index:2;width:28px;height:28px;background:#09090b;border:2.5px solid #22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(34,197,94,0.6);transition:transform .15s ease;font-size:12px;';
  inner.innerText = '👤';
  el.appendChild(inner);

  el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.25)'; });
  el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
  return el;
}

function mkHQMarker() {
  const el = document.createElement('div');
  el.style.cssText = 'width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
  const inner = document.createElement('div');
  inner.style.cssText = 'width:100%;height:100%;background:#1e3a8a;border:2.5px solid rgba(255,255,255,.95);border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.7);transition:transform .15s ease;font-size:14px;';
  inner.innerText = '🏠';
  el.appendChild(inner);
  el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.25)'; });
  el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
  return el;
}

// ─── Weather Icon Helper ───────────────────────────────────────────────────────
function WeatherIcon({ icon, className = 'h-4 w-4' }: { icon: string; className?: string }) {
  switch (icon) {
    case 'sun': return <Sun className={`${className} text-amber-400`} />;
    case 'cloud-rain': return <CloudRain className={`${className} text-blue-400`} />;
    case 'cloud-snow': return <CloudSnow className={`${className} text-cyan-200`} />;
    case 'cloud-lightning': return <CloudLightning className={`${className} text-yellow-300`} />;
    case 'cloud-fog': return <Wind className={`${className} text-slate-300`} />;
    default: return <Cloud className={`${className} text-slate-300`} />;
  }
}

// ─── Quick Assign Slide-Over Drawer ────────────────────────────────────────────
function QuickAssignDrawer({
  job,
  onClose,
  onAssigned,
}: {
  job: any | null;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assignedSuccess, setAssignedSuccess] = useState(false);

  useEffect(() => {
    if (!job) {
      setSuggestions([]);
      setError(null);
      setAssignedSuccess(false);
      return;
    }
    setLoading(true);
    setError(null);
    setAssignedSuccess(false);

    fetch(`/api/jobs/${job.id}/dispatch`)
      .then(r => r.json())
      .then(d => {
        if (d.suggestions) setSuggestions(d.suggestions);
      })
      .catch(err => {
        console.error('Failed to load dispatch suggestions:', err);
        setError('Could not load cleaner suggestions.');
      })
      .finally(() => setLoading(false));
  }, [job]);

  if (!job) return null;

  const handleDirectAssign = async (employeeId: string) => {
    setAssigningId(employeeId);
    try {
      const res = await fetch(`/api/jobs/${job.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'direct_assign',
          employee_id: employeeId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to assign cleaner');
      }
      setAssignedSuccess(true);
      setTimeout(() => {
        onAssigned();
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="absolute top-14 left-3 z-30 w-80 max-h-[calc(100vh-140px)] flex flex-col bg-black/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-white/10 flex items-start justify-between bg-white/[0.03]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
              {job.job_number || 'JOB'}
            </span>
            <span
              className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white"
              style={{ background: STATUS_COLORS[job.status] || '#64748b' }}
            >
              {STATUS_LABELS[job.status] || job.status}
            </span>
          </div>
          <h3 className="text-white font-black text-sm mt-1 truncate max-w-[210px]">
            {job.customer?.full_name || 'Client'}
          </h3>
          <p className="text-white/40 text-[11px] truncate">{job.address_line1}, {job.city}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Pricing & Window Strip */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-white/[0.02] border-b border-white/5 text-center">
        <div className="bg-white/5 rounded-lg p-1.5">
          <span className="text-white/40 text-[9px] uppercase font-bold block">Rate / Quote</span>
          <span className="text-emerald-400 font-black text-sm">
            ${(job.final_price || job.quoted_price || 0).toFixed(0)}
          </span>
        </div>
        <div className="bg-white/5 rounded-lg p-1.5">
          <span className="text-white/40 text-[9px] uppercase font-bold block">Window</span>
          <span className="text-white/80 font-bold text-xs truncate block">
            {job.scheduled_window || 'Standard'}
          </span>
        </div>
      </div>

      {/* Status Notice or Success */}
      {assignedSuccess ? (
        <div className="p-4 flex flex-col items-center justify-center gap-2 bg-emerald-500/15 text-center border-b border-emerald-500/30">
          <CheckCircle className="h-6 w-6 text-emerald-400 animate-bounce" />
          <p className="text-emerald-300 font-bold text-xs">Technician Assigned Successfully!</p>
          <p className="text-white/40 text-[10px]">Updating map telemetry...</p>
        </div>
      ) : null}

      {error ? (
        <div className="p-2.5 mx-3 mt-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Dispatch Suggestions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase font-black tracking-widest text-white/40">
            Closest Available Crew
          </span>
          <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Smart Match
          </span>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-white/30 text-xs">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
            <span>Calculating optimal drive times...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-6 text-center text-white/30 text-xs">
            No recommended cleaners currently online.
          </div>
        ) : (
          suggestions.slice(0, 5).map((sugg: any) => {
            const emp = sugg.employee;
            const driveMin = sugg.drive_time_minutes ? Math.round(sugg.drive_time_minutes) : null;
            const isAssigning = assigningId === emp.id;

            return (
              <div
                key={emp.id}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">{emp.full_name}</span>
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-white/10 text-white/60">
                      {emp.tier || 'Staff'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                    {driveMin ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                        <Car className="h-2.5 w-2.5" /> ~{driveMin} min away
                      </span>
                    ) : (
                      <span>In Zone</span>
                    )}
                    {emp.phone && (
                      <a href={`tel:${emp.phone}`} className="hover:text-blue-400 flex items-center gap-0.5">
                        <Phone className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <button
                  disabled={isAssigning || assignedSuccess}
                  onClick={() => handleDirectAssign(emp.id)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 shrink-0 shadow-md"
                >
                  {isAssigning ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-3 w-3" />
                      <span>Assign</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* External Details Link */}
      <div className="p-2.5 border-t border-white/10 bg-white/[0.02] text-center">
        <a
          href={`/sobadmin/jobs/${job.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center justify-center gap-1"
        >
          <span>Open Full Job Management</span>
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ─── Zone Sidebar ──────────────────────────────────────────────────────────────
function ZoneSidebar({
  zones,
  selectedZoneName,
  onSelectZone,
  collapsed,
  onToggleCollapse,
}: {
  zones: ZoneMetric[];
  selectedZoneName: string | null;
  onSelectZone: (name: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const sorted = [...zones].sort((a, b) => {
    const order = { low: 0, medium: 1, high: 2, idle: 3 };
    return order[a.coverage_status] - order[b.coverage_status];
  });

  const totalRevenue = zones.reduce((s, z) => s + z.total_revenue, 0);
  const totalActiveJobs = zones.reduce((s, z) => s + z.active_jobs, 0);
  const lowCoverage = zones.filter(z => z.coverage_status === 'low').length;

  return (
    <div
      className="absolute top-0 right-0 z-20 h-full flex flex-col bg-black/90 backdrop-blur-xl border-l border-white/10 transition-all duration-300"
      style={{ width: collapsed ? '44px' : '280px' }}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -left-3.5 top-16 z-30 w-7 h-7 bg-black/90 border border-white/15 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {collapsed ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-white/30 text-[10px] font-black uppercase tracking-widest" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
            Zone Intel
          </span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div>
              <p className="text-white font-black text-sm">Zone Intelligence</p>
              <p className="text-white/35 text-[10px] mt-0.5">Click a zone to fly there</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-emerald-400 font-bold">
              LIVE
            </span>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 border-b border-white/10 shrink-0">
            {[
              { label: 'Revenue', value: `$${totalRevenue.toFixed(0)}`, color: 'text-green-400' },
              { label: 'Active', value: totalActiveJobs, color: 'text-purple-400' },
              { label: 'Alerts', value: lowCoverage, color: lowCoverage > 0 ? 'text-red-400' : 'text-slate-500' },
            ].map(s => (
              <div key={s.label} className="py-2 px-2 text-center border-r border-white/10 last:border-0">
                <p className={`font-black text-sm ${s.color}`}>{s.value}</p>
                <p className="text-white/30 text-[9px] uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Zone list */}
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {sorted.map(zone => {
              const isSelected = selectedZoneName === zone.name;
              const cc = COVERAGE_COLORS[zone.coverage_status];
              const CoverageIcon = zone.coverage_status === 'high' ? TrendingUp
                : zone.coverage_status === 'low' ? TrendingDown
                : zone.coverage_status === 'medium' ? Minus : Minus;

              return (
                <button
                  key={zone.zone_id}
                  onClick={() => onSelectZone(zone.name)}
                  className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors hover:bg-white/5 ${isSelected ? 'bg-white/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-xs font-bold leading-tight truncate pr-2 flex-1">{zone.name}</p>
                    <div className="flex items-center gap-1 shrink-0" style={{ color: cc }}>
                      <CoverageIcon className="h-2.5 w-2.5" />
                      <span className="text-[9px] font-black uppercase">{zone.coverage_status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-1.5">
                    {[
                      { label: 'Jobs', value: zone.total_jobs_today, color: 'text-blue-400' },
                      { label: 'Active', value: zone.active_jobs, color: 'text-purple-400' },
                      { label: 'Online', value: zone.online_employees, color: 'text-emerald-400' },
                      { label: 'Rev', value: `$${zone.total_revenue >= 1000 ? (zone.total_revenue / 1000).toFixed(1) + 'k' : zone.total_revenue.toFixed(0)}`, color: 'text-green-400' },
                    ].map(m => (
                      <div key={m.label} className="bg-white/5 rounded p-1 text-center">
                        <p className={`text-[10px] font-black leading-none ${m.color}`}>{m.value}</p>
                        <p className="text-white/25 text-[8px] uppercase leading-none mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Dominance indicator */}
                  {zone.dominance_mode !== 'none' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {zone.dominance_mode === 'in_house' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span className="text-blue-300 text-[8px] font-black uppercase">SOB Staff</span>
                          <span className="text-blue-400/60 text-[8px]">{zone.in_house_employees}↑</span>
                        </div>
                      )}
                      {zone.dominance_mode === 'employee' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          <span className="text-orange-300 text-[8px] font-black uppercase">Contractor</span>
                          <span className="text-orange-400/60 text-[8px]">{zone.independent_employees}↑</span>
                        </div>
                      )}
                      {zone.dominance_mode === 'mixed' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          <span className="text-purple-300 text-[8px] font-black uppercase">Mixed</span>
                          <span className="text-purple-400/60 text-[8px]">{zone.in_house_employees}+{zone.independent_employees}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {zone.coverage_status === 'low' && zone.active_jobs > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0" />
                      <p className="text-red-400 text-[9px] font-medium">
                        {zone.active_jobs} job{zone.active_jobs > 1 ? 's' : ''}, {zone.online_employees} online
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-3 py-3 border-t border-white/10 shrink-0 space-y-1.5">
            <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-2">Coverage Scale</p>
            {[
              { color: COVERAGE_COLORS.high, label: 'High — Well covered' },
              { color: COVERAGE_COLORS.medium, label: 'Medium — Borderline' },
              { color: COVERAGE_COLORS.low, label: 'Low — Alert!' },
              { color: COVERAGE_COLORS.idle, label: 'Idle — No demand' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div style={{ width: 20, height: 5, background: l.color + '33', border: `1px solid ${l.color}`, borderRadius: 2, flexShrink: 0 }} />
                <span className="text-white/40 text-[9px]">{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DispatchMap({ onBack }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initialFrameDone = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const jobMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const locMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const hqMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const directionsCacheRef = useRef<{ [key: string]: number[][] }>({});

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapToken, setMapToken] = useState('');
  const [currentStyle, setCurrentStyle] = useState<'dark' | 'satellite'>('dark');
  const [mapData, setMapData] = useState<MapData>({
    jobs: [], employeeLocations: [], employeeHQs: [], zoneMetrics: [], assignmentLines: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Weather telemetry
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    shift: 'all',
    search: '',
    showJobs: true,
    showEmployees: true,
    showHQs: true,
    showZones: true,
    showLines: true,
    showHeatmap: false,
    showActivityDots: true,
  });

  const supabase = createClient();
  const [selectedDate, setSelectedDate] = useState<string>('all');

  // ── Fetch Weather ────────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch('/api/operations/weather?lat=43.6532&lng=-79.3832');
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const iv = setInterval(fetchWeather, 300000); // 5 mins
    return () => clearInterval(iv);
  }, [fetchWeather]);

  // ── Data Fetch ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/operations/map-data?date=${selectedDate}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMapData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Map data error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    const ch = supabase
      .channel('dispatch-map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_locations' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData, supabase]);

  // ── Map token ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(cfg => {
      if (cfg.mapboxToken) setMapToken(cfg.mapboxToken);
    }).catch(() => {});
  }, []);

  // ── Register Sources and Layers ──────────────────────────────────────────────
  const setupLayers = useCallback((map: mapboxgl.Map) => {
    // 1. Zone polygons
    if (!map.getSource('zones-source')) {
      map.addSource('zones-source', { type: 'geojson', data: '/api/operations/zones-geojson' });
      map.addLayer({
        id: 'zones-fill', type: 'fill', source: 'zones-source',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.08 }
      });
      map.addLayer({
        id: 'zones-outline', type: 'line', source: 'zones-source',
        paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.5 }
      });
      map.addLayer({
        id: 'zones-labels', type: 'symbol', source: 'zones-source',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          'text-max-width': 8,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': 'rgba(148,163,184,0.7)',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1
        },
      });

      map.on('click', 'zones-fill', (e) => {
        const name = e.features?.[0]?.properties?.name;
        if (name) window.dispatchEvent(new CustomEvent('zone-map-click', { detail: { name } }));
      });
      map.on('mouseenter', 'zones-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'zones-fill', () => { map.getCanvas().style.cursor = ''; });
    }

    // 2. Heatmap Layer
    if (!map.getSource('jobs-heatmap')) {
      map.addSource('jobs-heatmap', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'jobs-heat',
        type: 'heatmap',
        source: 'jobs-heatmap',
        maxzoom: 15,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 12, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(59,130,246,0.6)',
            0.4, 'rgba(6,182,212,0.8)',
            0.6, 'rgba(34,197,94,0.85)',
            0.8, 'rgba(234,179,8,0.9)',
            1, 'rgba(239,68,68,0.95)'
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 9, 24, 14, 40],
          'heatmap-opacity': 0.85,
        }
      });
    }

    // 3. Activity Dots Layer (Micro-telemetry pings)
    if (!map.getSource('activity-dots')) {
      map.addSource('activity-dots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'activity-dots-layer',
        type: 'circle',
        source: 'activity-dots',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.7,
          'circle-blur': 0.4,
        }
      });
    }

    // 4. Assignment Lines (Road Navigation Paths)
    if (!map.getSource('assignment-lines')) {
      map.addSource('assignment-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'assignment-lines-base',
        type: 'line',
        source: 'assignment-lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });
      map.addLayer({
        id: 'assignment-lines-flow',
        type: 'line',
        source: 'assignment-lines',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.5,
          'line-dasharray': [2, 4],
          'line-opacity': 0.9,
        },
      });
    }
  }, []);

  // ── Map Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapToken) return;
    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[currentStyle],
      center: [-79.3832, 43.6532],
      zoom: 9.5,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    mapRef.current = map;

    map.on('load', () => {
      setupLayers(map);
      map.resize();
      setMapLoaded(true);
    });

    map.on('style.load', () => {
      setupLayers(map);
      map.resize();
    });

    resizeObserverRef.current = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    if (mapContainerRef.current) {
      resizeObserverRef.current.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [mapToken, setupLayers]);

  // ── Style switcher ───────────────────────────────────────────────────────────
  const handleToggleStyle = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextStyle = currentStyle === 'dark' ? 'satellite' : 'dark';
    setCurrentStyle(nextStyle);
    map.setStyle(MAP_STYLES[nextStyle]);
  };

  // ── Zone map-click handler ───────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: Event) => setSelectedZoneName((e as CustomEvent).detail?.name ?? null);
    window.addEventListener('zone-map-click', h);
    return () => window.removeEventListener('zone-map-click', h);
  }, []);

  // ── Highlight Zone Outline on Selection ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (map.getLayer('zones-outline') && map.getLayer('zones-fill')) {
      if (selectedZoneName) {
        map.setPaintProperty('zones-outline', 'line-color', [
          'case',
          ['==', ['get', 'name'], selectedZoneName],
          '#60a5fa',
          '#3b82f6',
        ]);
        map.setPaintProperty('zones-outline', 'line-width', [
          'case',
          ['==', ['get', 'name'], selectedZoneName],
          3.5,
          1.5,
        ]);
        map.setPaintProperty('zones-outline', 'line-opacity', [
          'case',
          ['==', ['get', 'name'], selectedZoneName],
          0.95,
          0.4,
        ]);
        map.setPaintProperty('zones-fill', 'fill-opacity', [
          'case',
          ['==', ['get', 'name'], selectedZoneName],
          0.22,
          0.06,
        ]);
      } else {
        map.setPaintProperty('zones-outline', 'line-color', '#3b82f6');
        map.setPaintProperty('zones-outline', 'line-width', 1.5);
        map.setPaintProperty('zones-outline', 'line-opacity', 0.5);
        map.setPaintProperty('zones-fill', 'fill-opacity', 0.08);
      }
    }
  }, [selectedZoneName, mapLoaded]);

  // ── Fly to zone when selected ────────────────────────────────────────────────
  const handleSelectZone = useCallback((name: string) => {
    setSelectedZoneName(prev => prev === name ? null : name);
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const features = map.querySourceFeatures('zones-source', { filter: ['==', ['get', 'name'], name] });
    if (features.length > 0) {
      const coords: number[][] = [];
      const collectCoords = (geom: any) => {
        if (geom.type === 'Polygon') geom.coordinates[0].forEach((c: number[]) => coords.push(c));
        else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((p: number[][][]) => p[0].forEach((c: number[]) => coords.push(c)));
      };
      features.forEach(f => collectCoords(f.geometry));
      if (coords.length > 0) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c as [number, number]),
          new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
        );
        map.fitBounds(bounds, { padding: { top: 70, bottom: 90, left: 50, right: sidebarCollapsed ? 60 : 300 }, maxZoom: 13, duration: 800 });
      }
    }
  }, [mapLoaded, sidebarCollapsed]);

  // ── Shift Matcher ────────────────────────────────────────────────────────────
  const matchesShift = useCallback((job: any, shift: string) => {
    if (shift === 'all') return true;
    const win = (job.scheduled_window || '').toLowerCase();
    if (shift === 'morning') return win.includes('morning') || win.includes('am') || /0?[789]|1[01]/.test(win);
    if (shift === 'afternoon') return win.includes('afternoon') || win.includes('pm') || /1[23456]/.test(win);
    if (shift === 'night') return win.includes('evening') || win.includes('night') || /1[789]|2[0123]/.test(win);
    return true;
  }, []);

  // ── Filtered Datasets ────────────────────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    return mapData.jobs.filter(job => {
      if (filters.status !== 'all' && job.status !== filters.status) return false;
      if (!matchesShift(job, filters.shift)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return job.address_line1?.toLowerCase().includes(q) ||
          job.customer?.full_name?.toLowerCase().includes(q) ||
          job.job_number?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [mapData.jobs, filters, matchesShift]);

  const filteredEmployees = useMemo(() => {
    return mapData.employeeLocations.filter(loc =>
      !filters.search || loc.employee?.full_name?.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [mapData.employeeLocations, filters.search]);

  // ── Update Heatmap Source ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource('jobs-heatmap') as mapboxgl.GeoJSONSource;
    if (!src) return;

    if (map.getLayer('jobs-heat')) {
      map.setLayoutProperty('jobs-heat', 'visibility', filters.showHeatmap ? 'visible' : 'none');
    }

    if (!filters.showHeatmap) return;

    const features = filteredJobs
      .filter(j => j.latitude && j.longitude)
      .map(j => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [j.longitude, j.latitude] },
        properties: { weight: j.status === 'on_the_way' || j.status === 'in_progress' ? 1 : 0.6 },
      }));

    src.setData({ type: 'FeatureCollection', features });
  }, [mapLoaded, filteredJobs, filters.showHeatmap]);

  // ── Update Activity Dots Source (Alive Field Telemetry) ───────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource('activity-dots') as mapboxgl.GeoJSONSource;
    if (!src) return;

    if (map.getLayer('activity-dots-layer')) {
      map.setLayoutProperty('activity-dots-layer', 'visibility', filters.showActivityDots ? 'visible' : 'none');
    }

    if (!filters.showActivityDots) return;

    // Generate telemetry micro-dots around active jobs and zones
    const dots: any[] = [];
    filteredJobs.slice(0, 40).forEach((j, i) => {
      if (!j.latitude || !j.longitude) return;
      // Scatter subtle activity dots
      const offsetLng = (Math.sin(i * 1.7) * 0.006);
      const offsetLat = (Math.cos(i * 1.7) * 0.006);
      dots.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [j.longitude + offsetLng, j.latitude + offsetLat] },
        properties: {
          color: i % 2 === 0 ? '#38bdf8' : '#34d399',
          radius: 3 + (i % 3),
        },
      });
    });

    src.setData({ type: 'FeatureCollection', features: dots });
  }, [mapLoaded, filteredJobs, filters.showActivityDots]);

  // ── Road Routing via Directions API ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource('assignment-lines') as mapboxgl.GeoJSONSource;
    if (!src) return;

    const vis = filters.showLines ? 'visible' : 'none';
    if (map.getLayer('assignment-lines-base')) map.setLayoutProperty('assignment-lines-base', 'visibility', vis);
    if (map.getLayer('assignment-lines-flow')) map.setLayoutProperty('assignment-lines-flow', 'visibility', vis);

    if (!filters.showLines || mapData.assignmentLines.length === 0) {
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    let isMounted = true;

    async function buildRoutes() {
      const features: any[] = [];

      for (const line of mapData.assignmentLines) {
        const cacheKey = `${line.from[0]},${line.from[1]}_${line.to[0]},${line.to[1]}`;
        let coords = directionsCacheRef.current[cacheKey];

        if (!coords) {
          try {
            const res = await fetch(
              `/api/operations/directions?start_lng=${line.from[0]}&start_lat=${line.from[1]}&end_lng=${line.to[0]}&end_lat=${line.to[1]}`
            );
            if (res.ok) {
              const d = await res.json();
              if (d.routes?.[0]?.geometry?.coordinates) {
                coords = d.routes[0].geometry.coordinates;
                directionsCacheRef.current[cacheKey] = coords;
              }
            }
          } catch {
            // fallback to straight line
          }
        }

        features.push({
          type: 'Feature',
          properties: { color: line.job_status === 'on_the_way' ? '#8b5cf6' : '#eab308' },
          geometry: {
            type: 'LineString',
            coordinates: coords || [line.from, line.to],
          },
        });
      }

      if (isMounted && mapRef.current?.getSource('assignment-lines')) {
        src.setData({ type: 'FeatureCollection', features });
      }
    }

    buildRoutes();

    return () => { isMounted = false; };
  }, [mapLoaded, mapData.assignmentLines, filters.showLines]);

  // ── Choropleth ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !mapData.zoneMetrics.length || !map.getLayer('zones-fill')) return;
    const matchExpr: any[] = ['match', ['get', 'zone_id']];
    const seen = new Set();
    mapData.zoneMetrics.forEach(zm => {
      if (!seen.has(zm.zone_id)) {
        seen.add(zm.zone_id);
        matchExpr.push(zm.zone_id, COVERAGE_COLORS[zm.coverage_status]);
      }
    });
    matchExpr.push('#3b82f6');
    map.setPaintProperty('zones-fill', 'fill-color', matchExpr as any);
    map.setPaintProperty('zones-fill', 'fill-opacity', 0.12);
    map.setPaintProperty('zones-outline', 'line-color', matchExpr as any);
  }, [mapLoaded, mapData.zoneMetrics]);

  // ── Markers ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const { employeeHQs } = mapData;

    // Jobs
    const jobIds = new Set(filteredJobs.map((j: any) => j.id));
    Object.keys(jobMarkersRef.current).forEach(id => {
      if (!jobIds.has(id) || !filters.showJobs) {
        jobMarkersRef.current[id].remove();
        delete jobMarkersRef.current[id];
      }
    });

    if (filters.showJobs) {
      filteredJobs.forEach((job: any) => {
        if (!job.longitude || !job.latitude) return;
        const isAtRisk = job.status === 'confirmed' && !job.employee;

        if (!jobMarkersRef.current[job.id]) {
          const el = mkJobMarker(job, isAtRisk, () => setSelectedJob(job));
          jobMarkersRef.current[job.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([job.longitude, job.latitude])
            .addTo(map);
        } else {
          jobMarkersRef.current[job.id].setLngLat([job.longitude, job.latitude]);
        }
      });
    }

    // Employees
    const locIds = new Set(filteredEmployees.map((l: any) => l.id));
    Object.keys(locMarkersRef.current).forEach(id => {
      if (!locIds.has(id) || !filters.showEmployees) {
        locMarkersRef.current[id].remove();
        delete locMarkersRef.current[id];
      }
    });

    if (filters.showEmployees) {
      filteredEmployees.forEach((loc: any) => {
        if (!loc.longitude || !loc.latitude) return;
        const c = loc.employee;
        const popupHtml = `<div style="font-family:system-ui,sans-serif;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <div style="width:7px;height:7px;background:#22c55e;border-radius:50%;box-shadow:0 0 6px #22c55e;"></div>
            <span style="font-size:10px;color:#22c55e;font-weight:800;">LIVE TELEMETRY</span>
          </div>
          <p style="font-weight:800;font-size:14px;margin:0 0 2px;color:#fff;">${c?.full_name ?? 'Technician'}</p>
          <p style="font-size:10px;color:#999;margin:0 0 6px;text-transform:capitalize;">${c?.tier ?? 'Pro'} Tier</p>
          ${c?.phone ? `<p style="font-size:10px;color:#bbb;margin:0 0 6px;">📞 <a href="tel:${c.phone}" style="color:#60a5fa">${c.phone}</a></p>` : ''}
          <a href="/sobadmin/employees/${c?.id}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#60a5fa;text-decoration:none;font-weight:700;">View Profile ↗</a>
        </div>`;

        if (!locMarkersRef.current[loc.id]) {
          locMarkersRef.current[loc.id] = new mapboxgl.Marker({ element: mkEmployeeMarker(c) })
            .setLngLat([loc.longitude, loc.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: '240px' }).setHTML(popupHtml))
            .addTo(map);
        } else {
          locMarkersRef.current[loc.id].setLngLat([loc.longitude, loc.latitude]);
        }
      });
    }

    // HQs
    const hqIds = new Set(employeeHQs.map((h: any) => h.id));
    Object.keys(hqMarkersRef.current).forEach(id => {
      if (!hqIds.has(id) || !filters.showHQs) {
        hqMarkersRef.current[id].remove();
        delete hqMarkersRef.current[id];
      }
    });

    if (filters.showHQs) {
      employeeHQs.forEach((hq: any) => {
        if (!hq.longitude || !hq.latitude) return;
        const popupHtml = `<div style="font-family:system-ui,sans-serif;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <div style="width:7px;height:7px;background:#1d4ed8;border-radius:2px;"></div>
            <span style="font-size:10px;color:#93c5fd;font-weight:800;">BASE STATION</span>
          </div>
          <p style="font-weight:800;font-size:14px;margin:0 0 6px;color:#fff;">${hq.full_name}</p>
          <a href="/sobadmin/employees/${hq.id}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#60a5fa;text-decoration:none;font-weight:700;">View Profile ↗</a>
        </div>`;

        if (!hqMarkersRef.current[hq.id]) {
          hqMarkersRef.current[hq.id] = new mapboxgl.Marker({ element: mkHQMarker() })
            .setLngLat([hq.longitude, hq.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: '240px' }).setHTML(popupHtml))
            .addTo(map);
        } else {
          hqMarkersRef.current[hq.id].setLngLat([hq.longitude, hq.latitude]);
        }
      });
    }

    // Auto-frame initial
    if (!initialFrameDone.current && filteredJobs.length > 0) {
      const allCoords: [number, number][] = [
        ...filteredJobs.filter((j: any) => j.longitude && j.latitude).map((j: any) => [j.longitude, j.latitude] as [number, number]),
        ...filteredEmployees.filter((l: any) => l.longitude && l.latitude).map((l: any) => [l.longitude, l.latitude] as [number, number]),
      ];
      if (allCoords.length >= 2) {
        const bounds = allCoords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));
        map.fitBounds(bounds, { padding: { top: 80, bottom: 100, left: 50, right: sidebarCollapsed ? 60 : 300 }, maxZoom: 14, duration: 800 });
        initialFrameDone.current = true;
      }
    }
  }, [mapLoaded, filteredJobs, filteredEmployees, mapData.employeeHQs, filters.showJobs, filters.showEmployees, filters.showHQs, sidebarCollapsed]);

  // ── Derived Metrics ──────────────────────────────────────────────────────────
  const metrics = {
    jobsToday: filteredJobs.length,
    revenueToday: filteredJobs.reduce((s, j) => s + (j.quoted_price || 0), 0),
    employeesOnline: mapData.employeeLocations.length,
    active: filteredJobs.filter(j => ['on_the_way', 'in_progress'].includes(j.status)).length,
    completed: filteredJobs.filter(j => j.status === 'completed').length,
    issues: filteredJobs.filter(j => ['disputed', 'refunded'].includes(j.status)).length,
  };

  const statusGroups = [
    { key: 'all', label: 'All', color: '#94a3b8' },
    { key: 'confirmed', label: 'Confirmed', color: STATUS_COLORS.confirmed },
    { key: 'on_the_way', label: 'En Route', color: STATUS_COLORS.on_the_way },
    { key: 'in_progress', label: 'In Progress', color: STATUS_COLORS.in_progress },
    { key: 'completed', label: 'Done', color: STATUS_COLORS.completed },
    { key: 'disputed', label: 'Issues', color: STATUS_COLORS.disputed },
  ];

  const shiftGroups = [
    { key: 'all' as const, label: 'All Shifts' },
    { key: 'morning' as const, label: 'Morning (7a-12p)' },
    { key: 'afternoon' as const, label: 'Afternoon (12p-5p)' },
    { key: 'night' as const, label: 'Night (5p-12a)' },
  ];

  const layerToggles = [
    { key: 'showJobs' as const, label: 'Jobs', icon: Briefcase },
    { key: 'showEmployees' as const, label: 'Live', icon: Radio },
    { key: 'showLines' as const, label: 'Routes', icon: GitBranch },
    { key: 'showHeatmap' as const, label: 'Heatmap', icon: Flame },
    { key: 'showActivityDots' as const, label: 'Telemetry', icon: Sparkles },
    { key: 'showZones' as const, label: 'Zones', icon: Map },
  ];

  const sidebarWidth = sidebarCollapsed ? 44 : 280;

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-black overflow-hidden font-sans select-none">
      <style>{STYLES_INJECTION}</style>

      {/* Map canvas */}
      <div
        ref={mapContainerRef}
        className="absolute top-0 left-0 bottom-0 transition-all duration-300"
        style={{ right: `${sidebarWidth}px` }}
      />

      {/* ── Top Unified Command HUD ─────────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 z-20 flex flex-wrap items-center gap-2 px-3 py-2 bg-black/90 backdrop-blur-xl border-b border-white/10 transition-all duration-300"
        style={{ right: `${sidebarWidth}px` }}
      >
        {/* Dashboard Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 border border-white/10 rounded-lg text-white/70 hover:text-white text-[11px] font-bold transition-colors shrink-0 shadow-sm"
        >
          <List className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>

        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* Date Scope Controls: All Active Jobs vs Single Date */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setSelectedDate('all')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              selectedDate === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            All Footprint ({mapData.jobs.length})
          </button>
          <button
            onClick={() => {
              if (selectedDate === 'all') {
                setSelectedDate(new Date().toISOString().split('T')[0]);
              }
            }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              selectedDate !== 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            By Date
          </button>
        </div>

        {selectedDate !== 'all' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/6 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [color-scheme:dark]"
          />
        )}

        {/* Shift Time Scrubber */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
          <Clock className="h-3 w-3 text-white/35 ml-1.5 mr-0.5" />
          {shiftGroups.map(sg => (
            <button
              key={sg.key}
              onClick={() => setFilters(f => ({ ...f, shift: sg.key }))}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${filters.shift === sg.key ? 'bg-blue-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
            >
              {sg.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[150px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/35 pointer-events-none" />
          <input
            type="text"
            placeholder="Search jobs, customers, crew..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-1.5 bg-white/6 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-1 py-1 shrink-0">
          {statusGroups.map(sg => (
            <button
              key={sg.key}
              onClick={() => setFilters(f => ({ ...f, status: sg.key }))}
              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all ${filters.status === sg.key ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
              style={filters.status === sg.key ? { background: sg.color } : {}}
            >
              {sg.label}
            </button>
          ))}
        </div>

        {/* Layer & Mode Toggles */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-1 py-1 shrink-0">
          {layerToggles.map(lt => (
            <button
              key={lt.key}
              onClick={() => setFilters(f => ({ ...f, [lt.key]: !f[lt.key] }))}
              title={lt.label}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${filters[lt.key] ? (lt.key === 'showHeatmap' ? 'bg-orange-600 text-white' : 'bg-blue-600/85 text-white') : 'text-white/35 hover:text-white/60'}`}
            >
              <lt.icon className="h-3 w-3" />
              <span>{lt.label}</span>
            </button>
          ))}
        </div>

        {/* Dark / Satellite Switcher */}
        <button
          onClick={handleToggleStyle}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white text-[10px] font-bold transition-colors shrink-0"
          title="Toggle Satellite Imagery"
        >
          <Layers className="h-3 w-3" />
          <span className="uppercase">{currentStyle === 'dark' ? 'Sat' : 'Dark'}</span>
        </button>

        {/* Refresh */}
        <button
          onClick={() => { setLoading(true); fetchData(); fetchWeather(); }}
          className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white transition-colors shrink-0"
          title="Refresh All Telemetry"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Weather Telemetry Widget (Floating Glass HUD) ────────────────────── */}
      {weather && (
        <div className="absolute top-16 left-3 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs shadow-xl">
          <WeatherIcon icon={weather.condition.icon} className="h-4 w-4 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-sm">{weather.temperature}°C</span>
              <span className="text-white/40 text-[10px]">· {weather.condition.label}</span>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-white/30 mt-0.5">
              <span>Wind {weather.windSpeed} km/h</span>
              <span>•</span>
              <span>Humidity {weather.humidity}%</span>
            </div>
          </div>
          {weather.condition.impact !== 'normal' && (
            <div className="ml-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Delay Caution</span>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Assign Slide-Over Drawer ───────────────────────────────────── */}
      <QuickAssignDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onAssigned={() => {
          fetchData();
        }}
      />

      {/* ── Bottom Metrics Strip & Telemetry Ticker ──────────────────────────── */}
      <div
        className="absolute bottom-8 left-3 z-20 flex items-center gap-2 overflow-x-auto scrollbar-none transition-all duration-300"
        style={{ right: `${sidebarWidth + 12}px` }}
      >
        {[
          { label: 'Jobs Today', value: metrics.jobsToday, icon: Briefcase, color: 'text-blue-400' },
          { label: 'Revenue', value: `$${metrics.revenueToday.toFixed(0)}`, icon: DollarSign, color: 'text-green-400' },
          { label: 'Live Units', value: metrics.employeesOnline, icon: Radio, color: 'text-emerald-400' },
          { label: 'En Route', value: metrics.active, icon: Zap, color: 'text-purple-400' },
          { label: 'Completed', value: metrics.completed, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Issues', value: metrics.issues, icon: AlertTriangle, color: 'text-red-400' },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-2 bg-black/85 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shrink-0 shadow-lg">
            <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
            <div>
              <p className="text-white font-black text-sm leading-none">{m.value}</p>
              <p className="text-white/35 text-[9px] font-bold uppercase tracking-wider mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}

        {/* Ambient Telemetry Ticker */}
        <div className="hidden lg:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white/50 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>Grid active: {mapData.jobs.length} total operations tracked across GTA</span>
        </div>
      </div>

      {/* Telemetry Timestamp */}
      <div className="absolute bottom-2 left-3 z-20 text-white/25 text-[10px] flex items-center gap-2">
        <span>Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        <span>•</span>
        <span>Auto-sync 30s</span>
        <span>•</span>
        <span className="text-emerald-400/70">GPS Telemetry Online</span>
      </div>

      {/* ── Zone Intelligence Sidebar ────────────────────────────────────────── */}
      <ZoneSidebar
        zones={mapData.zoneMetrics}
        selectedZoneName={selectedZoneName}
        onSelectZone={handleSelectZone}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />
    </div>
  );
}
