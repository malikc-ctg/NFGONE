'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@/lib/supabase/client';
import {
  Search, RefreshCw, Radio, Briefcase,
  DollarSign, Zap, AlertTriangle, CheckCircle,
  Users, Home, GitBranch, Map, List,
  TrendingUp, TrendingDown, Minus, ChevronRight, ChevronLeft, ChevronDown,
  Flame, Layers, Clock, Cloud, CloudRain, CloudSnow,
  CloudLightning, Sun, Wind, X, Navigation, UserCheck, Car, Sparkles, Phone,
  MapPin, ExternalLink,
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
  avg_ticket?: number;
  total_employees: number;
  online_employees: number;
  assigned_jobs: number;
  coverage_status: 'high' | 'medium' | 'low' | 'idle';
  in_house_employees: number;
  independent_employees: number;
  in_house_jobs_today: number;
  employee_jobs_today: number;
  dominance_mode: 'in_house' | 'employee' | 'mixed' | 'none';
  jobs_preview?: {
    id: string;
    job_number: string;
    service_type: string;
    status: string;
    address_line1: string;
    price: number;
  }[];
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
  onSelectJob,
  collapsed,
  onToggleCollapse,
}: {
  zones: ZoneMetric[];
  selectedZoneName: string | null;
  onSelectZone: (name: string) => void;
  onSelectJob?: (job: any) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [showIdleZones, setShowIdleZones] = useState(false);
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);

  // Active zones (has jobs or online crew or alerts), ranked by revenue descending, then jobs descending
  const activeZones = useMemo(() => {
    return zones
      .filter(z => z.total_jobs_today > 0 || z.online_employees > 0 || z.coverage_status !== 'idle')
      .sort((a, b) => b.total_revenue - a.total_revenue || b.total_jobs_today - a.total_jobs_today);
  }, [zones]);

  // Standby zones (0 jobs today)
  const idleZones = useMemo(() => {
    return zones
      .filter(z => z.total_jobs_today === 0 && z.online_employees === 0 && z.coverage_status === 'idle')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [zones]);

  const totalRevenue = zones.reduce((s, z) => s + z.total_revenue, 0);
  const totalJobs = zones.reduce((s, z) => s + z.total_jobs_today, 0);
  const lowCoverage = zones.filter(z => z.coverage_status === 'low' && z.active_jobs > 0).length;

  return (
    <div
      className="absolute top-0 right-0 z-20 h-full flex flex-col bg-black/95 backdrop-blur-2xl border-l border-white/10 transition-all duration-300 shadow-2xl"
      style={{ width: collapsed ? '44px' : '320px' }}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -left-3.5 top-16 z-30 w-7 h-7 bg-black/90 border border-white/15 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors shadow-md"
        title={collapsed ? 'Expand Zone Intel' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {collapsed ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 cursor-pointer" onClick={onToggleCollapse}>
          <span className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
            Zone Intelligence
          </span>
          <div className="flex flex-col items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono text-white/40">{activeZones.length}z</span>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-3.5 py-3 border-b border-white/10 shrink-0 flex items-center justify-between bg-white/[0.02]">
            <div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-400" />
                <p className="text-white font-black text-sm tracking-tight">Zone Intelligence</p>
              </div>
              <p className="text-white/40 text-[10px] mt-0.5">Live regional revenue & dispatch capacity</p>
            </div>
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {/* KPI Summary Banner */}
          <div className="grid grid-cols-3 border-b border-white/10 shrink-0 bg-white/[0.01]">
            {[
              { label: 'Tracked Rev', value: `$${totalRevenue.toFixed(0)}`, color: 'text-green-400' },
              { label: 'Total Jobs', value: totalJobs, color: 'text-blue-400' },
              { label: 'Alerts', value: lowCoverage, color: lowCoverage > 0 ? 'text-red-400' : 'text-slate-500' },
            ].map(s => (
              <div key={s.label} className="py-2.5 px-2 text-center border-r border-white/10 last:border-0">
                <p className={`font-black text-sm tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-white/35 text-[9px] uppercase font-bold tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Zone list container */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            {/* Section Header: Active Hubs */}
            <div className="px-3 py-2 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Active Operations Hubs ({activeZones.length})
              </span>
              <span className="text-[9px] text-white/30">Ranked by Revenue</span>
            </div>

            {activeZones.length === 0 ? (
              <div className="p-6 text-center text-white/40 text-xs">
                No active jobs in the selected timeframe.
              </div>
            ) : (
              activeZones.map(zone => {
                const isSelected = selectedZoneName === zone.name;
                const isExpanded = expandedZoneId === zone.zone_id;
                const cc = COVERAGE_COLORS[zone.coverage_status];
                const CoverageIcon = zone.coverage_status === 'high' ? TrendingUp
                  : zone.coverage_status === 'low' ? TrendingDown
                  : zone.coverage_status === 'medium' ? Minus : Minus;

                return (
                  <div
                    key={zone.zone_id}
                    className={`border-b border-white/5 transition-all ${isSelected ? 'bg-blue-950/30 border-blue-500/30' : 'hover:bg-white/[0.03]'}`}
                  >
                    {/* Zone Header Button */}
                    <button
                      onClick={() => {
                        onSelectZone(zone.name);
                        setExpandedZoneId(prev => prev === zone.zone_id ? null : zone.zone_id);
                      }}
                      className="w-full text-left p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-white text-xs font-bold leading-tight truncate">{zone.name}</p>
                            {zone.city && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-white/40 font-mono">
                                {zone.city}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Coverage Status Badge */}
                        <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded bg-white/5" style={{ color: cc }}>
                          <CoverageIcon className="h-2.5 w-2.5" />
                          <span className="text-[8px] font-black uppercase tracking-wider">{zone.coverage_status}</span>
                        </div>
                      </div>

                      {/* Key stats row */}
                      <div className="grid grid-cols-4 gap-1">
                        <div className="bg-white/5 rounded px-1.5 py-1 text-center">
                          <p className="text-xs font-black text-blue-400">{zone.total_jobs_today}</p>
                          <p className="text-white/30 text-[8px] uppercase font-bold">Jobs</p>
                        </div>
                        <div className="bg-white/5 rounded px-1.5 py-1 text-center">
                          <p className="text-xs font-black text-green-400">
                            ${zone.total_revenue >= 1000 ? (zone.total_revenue / 1000).toFixed(1) + 'k' : zone.total_revenue.toFixed(0)}
                          </p>
                          <p className="text-white/30 text-[8px] uppercase font-bold">Revenue</p>
                        </div>
                        <div className="bg-white/5 rounded px-1.5 py-1 text-center">
                          <p className="text-xs font-black text-purple-400">{zone.active_jobs}</p>
                          <p className="text-white/30 text-[8px] uppercase font-bold">En Route</p>
                        </div>
                        <div className="bg-white/5 rounded px-1.5 py-1 text-center">
                          <p className="text-xs font-black text-emerald-400">{zone.online_employees}</p>
                          <p className="text-white/30 text-[8px] uppercase font-bold">Online</p>
                        </div>
                      </div>

                      {/* Dominance indicator tag */}
                      {zone.dominance_mode !== 'none' && (
                        <div className="flex items-center justify-between pt-0.5">
                          {zone.dominance_mode === 'in_house' && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 text-[8px] font-bold text-blue-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <span>SOB In-House Team ({zone.in_house_employees})</span>
                            </div>
                          )}
                          {zone.dominance_mode === 'employee' && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-[8px] font-bold text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>Contractor Network ({zone.independent_employees})</span>
                            </div>
                          )}
                          {zone.dominance_mode === 'mixed' && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 text-[8px] font-bold text-purple-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              <span>Mixed Staff ({zone.in_house_employees} Staff / {zone.independent_employees} Cont)</span>
                            </div>
                          )}

                          <span className="text-[9px] text-white/30 flex items-center gap-0.5 font-bold">
                            {isExpanded ? 'Hide Intel' : 'View Jobs'}
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </span>
                        </div>
                      )}

                      {zone.coverage_status === 'low' && zone.active_jobs > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-[9px] font-medium">
                          <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0" />
                          <span>Dispatch Alert: {zone.active_jobs} jobs pending with {zone.online_employees} online technician{zone.online_employees === 1 ? '' : 's'}.</span>
                        </div>
                      )}
                    </button>

                    {/* Expanded Detail Tray with Real Job Previews */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 bg-black/40 border-t border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[9px] text-white/40 pb-1">
                          <span>Avg Ticket: <strong className="text-white">${zone.avg_ticket || 0} CAD</strong></span>
                          <span>Assigned: <strong className="text-white">{zone.assigned_jobs}/{zone.total_jobs_today}</strong></span>
                        </div>

                        {zone.jobs_preview && zone.jobs_preview.length > 0 ? (
                          <div className="space-y-1.5">
                            <p className="text-[8px] font-black uppercase tracking-wider text-white/40">Zone Job Queue</p>
                            {zone.jobs_preview.map((pj) => {
                              const stColor = STATUS_COLORS[pj.status] || '#94a3b8';
                              return (
                                <div
                                  key={pj.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectJob) onSelectJob(pj);
                                  }}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 cursor-pointer transition-colors"
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-blue-400">#{pj.job_number}</span>
                                      <span
                                        className="text-[8px] font-bold px-1.5 py-0.2 rounded uppercase"
                                        style={{ background: `${stColor}20`, color: stColor, border: `1px solid ${stColor}40` }}
                                      >
                                        {(pj.status || '').replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-white/70 truncate mt-0.5">{pj.address_line1 || 'Address'}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-black text-green-400">
                                      ${Number(pj.price || 0).toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-white/30 italic py-1">No active job preview records.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Section Header: Standby / Idle Zones */}
            {idleZones.length > 0 && (
              <div className="border-t border-white/10 mt-1">
                <button
                  onClick={() => setShowIdleZones(p => !p)}
                  className="w-full px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-between text-left transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                    Standby Coverage Footprint ({idleZones.length})
                  </span>
                  <ChevronDown className={`h-3 w-3 text-white/40 transition-transform ${showIdleZones ? 'rotate-180' : ''}`} />
                </button>

                {showIdleZones && (
                  <div className="divide-y divide-white/5 bg-black/20">
                    {idleZones.map(iz => (
                      <button
                        key={iz.zone_id}
                        onClick={() => onSelectZone(iz.name)}
                        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <p className="text-white/70 text-xs font-medium">{iz.name}</p>
                          <p className="text-white/25 text-[9px]">{iz.city || 'GTA'}</p>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                          Standby
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-3 py-2.5 border-t border-white/10 shrink-0 space-y-1.5 bg-white/[0.01]">
            <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">Coverage Health Indicator</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { color: COVERAGE_COLORS.high, label: 'High — Covered' },
                { color: COVERAGE_COLORS.medium, label: 'Med — Adequate' },
                { color: COVERAGE_COLORS.low, label: 'Low — Understaffed' },
                { color: COVERAGE_COLORS.idle, label: 'Idle — Standby' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, background: l.color, borderRadius: 2, flexShrink: 0 }} />
                  <span className="text-white/40 text-[9px] truncate">{l.label}</span>
                </div>
              ))}
            </div>
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
        paint: { 'line-color': '#3b82f6', 'line-width': 1.8, 'line-opacity': 0.65 }
      });
      map.addLayer({
        id: 'zones-labels', type: 'symbol', source: 'zones-source',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          'text-max-width': 10,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': '#020617',
          'text-halo-width': 2.5
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
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([job.longitude, job.latitude]);

          const statusColor = STATUS_COLORS[job.status] || '#3b82f6';
          const price = Number(job.final_price) || Number(job.quoted_price) || 0;
          const statusLabel = STATUS_LABELS[job.status] || job.status || 'Job';

          const popupHtml = `
            <div style="font-family:system-ui,sans-serif;padding:6px;min-width:210px;background:#090d16;color:#fff;border-radius:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:11px;font-weight:800;color:#60a5fa;letter-spacing:0.5px;">#${job.job_number || 'JOB'}</span>
                <span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:${statusColor}25;border:1px solid ${statusColor}60;color:${statusColor};text-transform:uppercase;">${statusLabel}</span>
              </div>
              <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#f8fafc;line-height:1.2;">${job.address_line1 || 'Address'}</p>
              <p style="font-size:10px;color:#94a3b8;margin:0 0 6px;">${job.city || ''} ${job.postal_code || ''}</p>
              <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px;margin-top:4px;">
                <span style="font-size:12px;font-weight:800;color:#22c55e;">$${price.toFixed(2)} CAD</span>
                <span style="font-size:10px;color:#cbd5e1;font-weight:600;">${job.customer?.full_name || 'Customer'}</span>
              </div>
              ${job.employee ? `<p style="font-size:10px;color:#38bdf8;margin:6px 0 0;font-weight:600;">👤 Assigned: ${job.employee.full_name}</p>` : '<p style="font-size:9px;color:#f59e0b;margin:4px 0 0;font-weight:700;">⚠ Unassigned</p>'}
            </div>
          `;

          const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: '260px' }).setHTML(popupHtml);
          el.addEventListener('mouseenter', () => {
            marker.setPopup(popup);
            if (!popup.isOpen()) marker.togglePopup();
          });
          el.addEventListener('mouseleave', () => {
            if (popup.isOpen()) marker.togglePopup();
          });

          marker.addTo(map);
          jobMarkersRef.current[job.id] = marker;
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
    revenueToday: filteredJobs.reduce((s, j) => s + (Number(j.final_price) || Number(j.quoted_price) || 0), 0),
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

  const sidebarWidth = sidebarCollapsed ? 44 : 320;

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-black overflow-hidden font-sans select-none">
      <style>{STYLES_INJECTION}</style>

      {/* Map canvas */}
      <div
        ref={mapContainerRef}
        className="absolute top-0 left-0 bottom-0 transition-all duration-300"
        style={{ right: `${sidebarWidth}px` }}
      />

      {/* ── Top Unified Command HUD (Structured 2-Row Clean Layout) ───────────── */}
      <div
        className="absolute top-0 left-0 z-20 flex flex-col gap-2 p-2.5 bg-black/95 backdrop-blur-2xl border-b border-white/10 transition-all duration-300 shadow-xl"
        style={{ right: `${sidebarWidth}px` }}
      >
        {/* Row 1: Nav, Scope, Weather Pill, Layer Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Dashboard Back */}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 hover:bg-white/15 border border-white/10 rounded-lg text-white/80 hover:text-white text-[11px] font-bold transition-all shrink-0 shadow-sm"
            >
              <List className="h-3.5 w-3.5 text-blue-400" />
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
                className="bg-white/6 border border-white/10 rounded-lg text-xs text-white px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [color-scheme:dark]"
              />
            )}

            {/* Weather Telemetry Pill (Integrated directly into HUD, no overlaps) */}
            {weather && (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white shrink-0">
                <WeatherIcon icon={weather.condition.icon} className="h-3.5 w-3.5 shrink-0" />
                <span className="font-bold text-xs">{weather.temperature}°C</span>
                <span className="text-white/40 text-[10px] hidden sm:inline">· {weather.condition.label}</span>
                <span className="text-white/30 text-[9px] hidden md:inline">Wind {weather.windSpeed} km/h</span>
                {weather.condition.impact !== 'normal' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" /> Delay Caution
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Tools: Layers, Sat/Dark, Refresh */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Layer & Mode Toggles */}
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-1 py-0.5 shrink-0">
              {layerToggles.map(lt => (
                <button
                  key={lt.key}
                  onClick={() => setFilters(f => ({ ...f, [lt.key]: !f[lt.key] }))}
                  title={lt.label}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${filters[lt.key] ? (lt.key === 'showHeatmap' ? 'bg-orange-600 text-white' : 'bg-blue-600/85 text-white') : 'text-white/35 hover:text-white/60'}`}
                >
                  <lt.icon className="h-3 w-3" />
                  <span className="hidden lg:inline">{lt.label}</span>
                </button>
              ))}
            </div>

            {/* Dark / Satellite Switcher */}
            <button
              onClick={handleToggleStyle}
              className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white text-[10px] font-bold transition-colors shrink-0"
              title="Toggle Satellite Imagery"
            >
              <Layers className="h-3 w-3" />
              <span className="uppercase">{currentStyle === 'dark' ? 'Sat' : 'Dark'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => { setLoading(true); fetchData(); fetchWeather(); }}
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-colors shrink-0"
              title="Refresh All Telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Search, Status Filter Pills, Shift Scrubber */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative min-w-[160px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/35 pointer-events-none" />
            <input
              type="text"
              placeholder="Search jobs, customers, crew, addresses..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-8 pr-3 py-1 bg-white/6 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-1 py-0.5 shrink-0 overflow-x-auto">
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

          {/* Shift Time Scrubber */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
            <Clock className="h-3 w-3 text-white/35 ml-1 mr-0.5" />
            {shiftGroups.map(sg => (
              <button
                key={sg.key}
                onClick={() => setFilters(f => ({ ...f, shift: sg.key }))}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${filters.shift === sg.key ? 'bg-blue-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
              >
                {sg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

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
        onSelectJob={setSelectedJob}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />
    </div>
  );
}
