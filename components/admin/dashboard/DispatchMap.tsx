'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@/lib/supabase/client';
import {
  Search, Filter, RefreshCw, Radio, Layers,
  Users, Briefcase, DollarSign, Clock, TrendingUp, MapPin, X,
  AlertTriangle, CheckCircle, Zap, Navigation
} from 'lucide-react';
import type { Job, Contractor } from '@/types';


// ---------- Color config ----------
const STATUS_COLORS: Record<string, string> = {
  lead_received: '#f97316',
  quoted: '#fb923c',
  confirmed: '#3b82f6',
  offered: '#3b82f6',
  assigned: '#eab308',
  on_the_way: '#8b5cf6',
  in_progress: '#8b5cf6',
  completed: '#22c55e',
  disputed: '#ef4444',
  refunded: '#ef4444',
  cancelled: '#6b7280',
  default: '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  lead_received: 'Lead',
  quoted: 'Quoted',
  confirmed: 'Confirmed',
  offered: 'Offered',
  assigned: 'Assigned',
  on_the_way: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

interface MapData {
  jobs: any[];
  contractorLocations: any[];
  zones: any[];
  contractorHQs?: any[];
}

interface FilterState {
  status: string;
  search: string;
  showContractors: boolean;
  showJobs: boolean;
  showZones: boolean;
}

function createJobMarkerEl(status: string): HTMLElement {
  const el = document.createElement('div');
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.default;
  el.style.cssText = `
    width: 18px; height: 18px;
    background: ${color};
    border: 2.5px solid rgba(255,255,255,0.9);
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    cursor: pointer;
    transition: transform 0.15s ease;
  `;
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.4)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
  return el;
}

function createContractorMarkerEl(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 30px; height: 30px;
    background: #0a0a0a;
    border: 2.5px solid rgba(255,255,255,0.85);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.7);
    cursor: pointer;
    transition: transform 0.15s ease;
    font-size: 13px;
  `;
  el.innerText = '👤';
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
  return el;
}

function createHQMarkerEl(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 32px; height: 32px;
    background: #1e3a8a; /* dark blue */
    border: 2.5px solid rgba(255,255,255,0.9);
    border-radius: 8px; /* square to distinguish from location pins */
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.7);
    cursor: pointer;
    transition: transform 0.15s ease;
    font-size: 15px;
  `;
  el.innerText = '🏠';
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
  return el;
}

export default function DispatchMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const jobMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const locMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const hqMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapData, setMapData] = useState<MapData>({ jobs: [], contractorLocations: [], zones: [] });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [mapToken, setMapToken] = useState<string>('');
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/dark-v11');
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    search: '',
    showContractors: true,
    showJobs: true,
    showZones: true,
  });
  const supabase = createClient();

  // ---------- Fetch map data ----------
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/operations/map-data');
      if (!res.ok) throw new Error('Failed to fetch map data');
      const data = await res.json();
      setMapData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Map data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ---------- Fetch Mapbox token & style ----------
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => { 
        if (cfg.mapboxToken) setMapToken(cfg.mapboxToken); 
        if (cfg.mapboxStyle) setMapStyle(cfg.mapboxStyle);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('contractor-locations-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_locations' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, supabase]);

  // ---------- Initialize map ----------
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapToken) return;

    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-79.3832, 43.6532],
      zoom: 10.5,
      pitch: 0,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      setMapLoaded(true);
    });
    map.on('style.load', () => map.resize());
    map.on('error', (e) => console.error('Mapbox error:', e.error?.message || e));

    // Force resize after a short delay to handle dynamic container sizing
    setTimeout(() => map.resize(), 500);

    return () => { map.remove(); mapRef.current = null; };
  }, [mapToken, mapStyle]);

  // ---------- Render markers when data or filters change ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const { jobs, contractorLocations, contractorHQs = [] } = mapData;

    // Filter jobs
    const filteredJobs = jobs.filter(job => {
      if (filters.status !== 'all' && job.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!job.address_line1?.toLowerCase().includes(q) &&
          !job.customer?.full_name?.toLowerCase().includes(q) &&
          !job.job_number?.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    // --- JOBS ---
    const currentJobIds = new Set(filteredJobs.map(j => j.id));
    Object.keys(jobMarkersRef.current).forEach(id => {
      if (!currentJobIds.has(id) || !filters.showJobs) {
        jobMarkersRef.current[id].remove();
        delete jobMarkersRef.current[id];
      }
    });

    if (filters.showJobs) {
      filteredJobs.forEach(job => {
        if (!job.longitude || !job.latitude) return;
        if (!jobMarkersRef.current[job.id]) {
          const el = createJobMarkerEl(job.status);
          const popup = new mapboxgl.Popup({ offset: 14, closeButton: true, maxWidth: '280px' })
            .setHTML(`
              <div style="font-family: sans-serif; padding: 2px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span style="background:${STATUS_COLORS[job.status] ?? STATUS_COLORS.default}; color:white; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">
                    ${STATUS_LABELS[job.status] ?? job.status}
                  </span>
                  <span style="font-size:10px; color:#888;">${job.job_number}</span>
                </div>
                <p style="font-weight:700; font-size:13px; margin:0 0 2px;">${job.customer?.full_name ?? 'Unknown Customer'}</p>
                <p style="font-size:11px; color:#999; margin:0 0 8px;">${job.address_line1}, ${job.city}</p>
                <div style="display:flex; justify-content:space-between; font-size:11px; background:#111; padding:6px 8px; border-radius:8px;">
                  <span style="color:#888;">${job.service_type?.replace(/_/g, ' ')}</span>
                  <span style="font-weight:700; color:#22c55e;">$${job.quoted_price?.toFixed(0)}</span>
                </div>
                ${job.contractor ? `<p style="font-size:10px; color:#666; margin-top:6px;">Assigned: ${job.contractor.full_name}</p>` : ''}
              </div>
            `);

          jobMarkersRef.current[job.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([job.longitude, job.latitude])
            .setPopup(popup)
            .addTo(map);
        } else {
          jobMarkersRef.current[job.id].setLngLat([job.longitude, job.latitude]);
        }
      });
    }

    // --- CONTRACTOR LOCATIONS ---
    const currentLocIds = new Set(contractorLocations.map(l => l.id));
    Object.keys(locMarkersRef.current).forEach(id => {
      if (!currentLocIds.has(id) || !filters.showContractors) {
        locMarkersRef.current[id].remove();
        delete locMarkersRef.current[id];
      }
    });

    if (filters.showContractors) {
      contractorLocations.forEach(loc => {
        if (!loc.longitude || !loc.latitude) return;
        if (!locMarkersRef.current[loc.id]) {
          const c = loc.contractor;
          const el = createContractorMarkerEl();
          const popup = new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: '240px' })
            .setHTML(`
              <div style="font-family: sans-serif; padding: 2px;">
                <p style="font-weight:700; font-size:13px; margin:0 0 2px;">${c?.full_name ?? 'Contractor'}</p>
                <p style="font-size:10px; color:#999; margin:0 0 6px; text-transform:capitalize;">${c?.tier ?? ''} Tier</p>
                <div style="display:flex; align-items:center; gap:4px;">
                  <div style="width:6px;height:6px;background:#22c55e;border-radius:50%;"></div>
                  <span style="font-size:10px; color:#22c55e; font-weight:700;">ONLINE</span>
                </div>
                <p style="font-size:10px; color:#666; margin-top:4px;">${c?.phone ?? ''}</p>
              </div>
            `);

          locMarkersRef.current[loc.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([loc.longitude, loc.latitude])
            .setPopup(popup)
            .addTo(map);
        } else {
          locMarkersRef.current[loc.id].setLngLat([loc.longitude, loc.latitude]);
        }
      });
    }

    // --- CONTRACTOR HQS ---
    const currentHqIds = new Set(contractorHQs.map(hq => hq.id));
    Object.keys(hqMarkersRef.current).forEach(id => {
      if (!currentHqIds.has(id)) {
        hqMarkersRef.current[id].remove();
        delete hqMarkersRef.current[id];
      }
    });

    contractorHQs.forEach(hq => {
      if (!hq.longitude || !hq.latitude) return;
      if (!hqMarkersRef.current[hq.id]) {
        const el = createHQMarkerEl();
        const popup = new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: '240px' })
          .setHTML(`
            <div style="font-family: sans-serif; padding: 2px;">
              <p style="font-weight:700; font-size:13px; margin:0 0 2px;">${hq.full_name} HQ</p>
              <div style="display:flex; align-items:center; gap:4px; margin-top: 4px;">
                <div style="width:6px;height:6px;background:#1e3a8a;border-radius:50%;"></div>
                <span style="font-size:10px; color:#1e3a8a; font-weight:700;">HEADQUARTERS</span>
              </div>
              <p style="font-size:10px; color:#666; margin-top:4px;">${hq.phone ?? ''}</p>
            </div>
          `);

        hqMarkersRef.current[hq.id] = new mapboxgl.Marker({ element: el })
          .setLngLat([hq.longitude, hq.latitude])
          .setPopup(popup)
          .addTo(map);
      } else {
        hqMarkersRef.current[hq.id].setLngLat([hq.longitude, hq.latitude]);
      }
    });

  }, [mapLoaded, mapData, filters]);

  // ---------- Derived metrics ----------
  const metrics = {
    jobsToday: mapData.jobs.length,
    revenueToday: mapData.jobs.reduce((s, j) => s + (j.quoted_price || 0), 0),
    contractorsOnline: mapData.contractorLocations.length,
    active: mapData.jobs.filter(j => ['on_the_way', 'in_progress'].includes(j.status)).length,
    completed: mapData.jobs.filter(j => j.status === 'completed').length,
    issues: mapData.jobs.filter(j => ['disputed', 'refunded'].includes(j.status)).length,
  };

  const statusGroups = [
    { key: 'all', label: 'All', color: '#94a3b8' },
    { key: 'confirmed', label: 'Confirmed', color: STATUS_COLORS.confirmed },
    { key: 'on_the_way', label: 'En Route', color: STATUS_COLORS.on_the_way },
    { key: 'in_progress', label: 'In Progress', color: STATUS_COLORS.in_progress },
    { key: 'completed', label: 'Done', color: STATUS_COLORS.completed },
    { key: 'disputed', label: 'Issues', color: STATUS_COLORS.disputed },
  ];

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-black overflow-hidden">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      {/* Top toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
          <input
            type="text"
            placeholder="Search jobs, customers..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2.5 bg-black/70 backdrop-blur border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur border border-white/10 rounded-xl px-2 py-1.5">
          {statusGroups.map(sg => (
            <button
              key={sg.key}
              onClick={() => setFilters(f => ({ ...f, status: sg.key }))}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${filters.status === sg.key ? 'text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
              style={filters.status === sg.key ? { background: sg.color } : {}}
            >
              {sg.label}
            </button>
          ))}
        </div>

        {/* Layer toggles */}
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur border border-white/10 rounded-xl px-2 py-1.5">
          <button
            onClick={() => setFilters(f => ({ ...f, showJobs: !f.showJobs }))}
            className={`p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${filters.showJobs ? 'bg-blue-600/80 text-white' : 'text-white/40'}`}
          >
            <Briefcase className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, showContractors: !f.showContractors }))}
            className={`p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${filters.showContractors ? 'bg-white/10 text-white' : 'text-white/40'}`}
          >
            <Users className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="p-2 bg-black/70 backdrop-blur border border-white/10 rounded-xl text-white/60 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics strip */}
      <div className="absolute bottom-16 left-4 right-4 z-20 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: 'Jobs Today', value: metrics.jobsToday, icon: Briefcase, color: 'text-blue-400' },
          { label: 'Revenue', value: `$${metrics.revenueToday.toFixed(0)}`, icon: DollarSign, color: 'text-green-400' },
          { label: 'Online', value: metrics.contractorsOnline, icon: Radio, color: 'text-emerald-400' },
          { label: 'Active', value: metrics.active, icon: Zap, color: 'text-purple-400' },
          { label: 'Completed', value: metrics.completed, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Issues', value: metrics.issues, icon: AlertTriangle, color: 'text-red-400' },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-2 bg-black/80 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shrink-0">
            <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
            <div>
              <p className="text-white font-black text-sm leading-none">{m.value}</p>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute top-20 right-4 z-20 bg-black/80 backdrop-blur border border-white/10 rounded-xl p-3 space-y-2">
        <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Legend</p>
        {[
          { color: STATUS_COLORS.confirmed, label: 'Confirmed' },
          { color: STATUS_COLORS.on_the_way, label: 'En Route' },
          { color: STATUS_COLORS.in_progress, label: 'In Progress' },
          { color: STATUS_COLORS.completed, label: 'Completed' },
          { color: STATUS_COLORS.disputed, label: 'Issue' },
          { color: '#0a0a0a', label: 'Contractor', border: true },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2">
            <div
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: l.color,
                border: l.border ? '2px solid rgba(255,255,255,0.7)' : undefined,
                boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
              }}
            />
            <span className="text-white/60 text-[10px] font-medium">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Last refresh time */}
      <div className="absolute bottom-4 right-16 z-20 text-white/30 text-[10px]">
        Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Auto-refresh 30s
      </div>
    </div>
  );
}
