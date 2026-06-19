'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@/lib/supabase/client';
import {
  Search, RefreshCw, Radio, Briefcase,
  DollarSign, Zap, AlertTriangle, CheckCircle,
  Users, Home, GitBranch, Map, List,
  TrendingUp, TrendingDown, Minus, ChevronRight, ChevronLeft,
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

const LINE_COLORS: Record<string, string> = {
  assigned: '#eab308', on_the_way: '#8b5cf6', in_progress: '#8b5cf6',
};

// ─── Marker Factories ──────────────────────────────────────────────────────────
function mkJobMarker(status: string) {
  const el = document.createElement('div');
  el.style.cssText = 'width:18px;height:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
  const inner = document.createElement('div');
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.default;
  inner.style.cssText = `width:100%;height:100%;background:${c};border:2.5px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.5);transition:transform .15s ease;`;
  el.appendChild(inner);
  el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.4)'; });
  el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
  return el;
}

function mkContractorMarker() {
  const el = document.createElement('div');
  el.style.cssText = 'width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
  const inner = document.createElement('div');
  inner.style.cssText = `width:100%;height:100%;background:#0a0a0a;border:2.5px solid #22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.7);transition:transform .15s ease;font-size:13px;`;
  inner.innerText = '👤';
  el.appendChild(inner);
  el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.3)'; });
  el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
  return el;
}

function mkHQMarker() {
  const el = document.createElement('div');
  el.style.cssText = 'width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
  const inner = document.createElement('div');
  inner.style.cssText = `width:100%;height:100%;background:#1e3a8a;border:2.5px solid rgba(255,255,255,.9);border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.7);transition:transform .15s ease;font-size:15px;`;
  inner.innerText = '🏠';
  el.appendChild(inner);
  el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.3)'; });
  el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
  return el;
}

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
  total_contractors: number;
  online_contractors: number;
  assigned_jobs: number;
  coverage_status: 'high' | 'medium' | 'low' | 'idle';
  // Dominance
  in_house_contractors: number;
  independent_contractors: number;
  in_house_jobs_today: number;
  contractor_jobs_today: number;
  dominance_mode: 'in_house' | 'contractor' | 'mixed' | 'none';
}

interface FilterState {
  status: string;
  search: string;
  showJobs: boolean;
  showContractors: boolean;
  showHQs: boolean;
  showZones: boolean;
  showLines: boolean;
}

interface MapData {
  jobs: any[];
  contractorLocations: any[];
  contractorHQs: any[];
  zoneMetrics: ZoneMetric[];
  assignmentLines: any[];
}

interface Props { onBack: () => void; }

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
        /* Collapsed: show rotated label */
        <div className="flex-1 flex items-center justify-center">
          <span className="text-white/30 text-[10px] font-black uppercase tracking-widest" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
            Zone Intel
          </span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 shrink-0">
            <p className="text-white font-black text-sm">Zone Intelligence</p>
            <p className="text-white/35 text-[10px] mt-0.5">Click a zone to fly there</p>
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
                      { label: 'Online', value: zone.online_contractors, color: 'text-emerald-400' },
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
                          <span className="text-blue-400/60 text-[8px]">{zone.in_house_contractors}↑</span>
                        </div>
                      )}
                      {zone.dominance_mode === 'contractor' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          <span className="text-orange-300 text-[8px] font-black uppercase">Contractor</span>
                          <span className="text-orange-400/60 text-[8px]">{zone.independent_contractors}↑</span>
                        </div>
                      )}
                      {zone.dominance_mode === 'mixed' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          <span className="text-purple-300 text-[8px] font-black uppercase">Mixed</span>
                          <span className="text-purple-400/60 text-[8px]">{zone.in_house_contractors}+{zone.independent_contractors}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {zone.coverage_status === 'low' && zone.active_jobs > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0" />
                      <p className="text-red-400 text-[9px] font-medium">
                        {zone.active_jobs} job{zone.active_jobs > 1 ? 's' : ''}, {zone.online_contractors} online
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
            <div className="pt-2 border-t border-white/10 space-y-1">
              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Dominance</p>
              {[
                { color: '#60a5fa', label: 'SOB Staff dominant' },
                { color: '#fb923c', label: 'Contractor dominant' },
                { color: '#c084fc', label: 'Mixed workforce' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                  <span className="text-white/40 text-[9px]">{l.label}</span>
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

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapToken, setMapToken] = useState('');
  const [mapData, setMapData] = useState<MapData>({
    jobs: [], contractorLocations: [], contractorHQs: [], zoneMetrics: [], assignmentLines: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all', search: '',
    showJobs: true, showContractors: true, showHQs: true, showZones: true, showLines: true,
  });

  const supabase = createClient();

  // ── Data Fetch ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/operations/map-data');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMapData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Map data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    const ch = supabase
      .channel('dispatch-map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_locations' }, fetchData)
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

  // ── Map Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapToken) return;
    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-79.3832, 43.6532],
      zoom: 9.5,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    mapRef.current = map;

    map.on('load', () => {
      // Zone polygons
      map.addSource('zones-source', { type: 'geojson', data: '/api/operations/zones-geojson' });
      map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones-source', paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.07 } });
      map.addLayer({ id: 'zones-outline', type: 'line', source: 'zones-source', paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.5 } });
      map.addLayer({
        id: 'zones-labels', type: 'symbol', source: 'zones-source',
        layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'], 'text-max-width': 8, 'text-anchor': 'center' },
        paint: { 'text-color': 'rgba(148,163,184,0.7)', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1 },
      });

      // Assignment lines
      map.addSource('assignment-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'assignment-lines-layer', type: 'line', source: 'assignment-lines',
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [3, 3], 'line-opacity': 0.7 },
      });

      // Zone click → fire custom event (to sidestep stale closure problem)
      map.on('click', 'zones-fill', (e) => {
        const name = e.features?.[0]?.properties?.name;
        if (name) window.dispatchEvent(new CustomEvent('zone-map-click', { detail: { name } }));
      });
      map.on('mouseenter', 'zones-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'zones-fill', () => { map.getCanvas().style.cursor = ''; });

      map.resize();
      setMapLoaded(true);
    });

    map.on('style.load', () => map.resize());

    // Automatically call resize() when the container size changes (e.g. sidebar collapse)
    resizeObserverRef.current = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    if (mapContainerRef.current) {
      resizeObserverRef.current.observe(mapContainerRef.current);
    }

    setTimeout(() => map.resize(), 500);
    return () => { 
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      map.remove(); 
      mapRef.current = null; 
    };
  }, [mapToken]);

  // ── Zone map-click handler ───────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: Event) => setSelectedZoneName((e as CustomEvent).detail?.name ?? null);
    window.addEventListener('zone-map-click', h);
    return () => window.removeEventListener('zone-map-click', h);
  }, []);

  // ── Fly to zone when selected ────────────────────────────────────────────────
  const handleSelectZone = useCallback((name: string) => {
    setSelectedZoneName(prev => prev === name ? null : name);
    // We rely on the GeoJSON data being loaded — find the feature's center
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource('zones-source') as any;
    if (!src) return;
    // Use querySourceFeatures to get bounds
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
        map.fitBounds(bounds, { padding: { top: 60, bottom: 80, left: 40, right: sidebarCollapsed ? 60 : 300 }, maxZoom: 13, duration: 800 });
      }
    }
  }, [mapLoaded, sidebarCollapsed]);

  // ── Zone layer visibility ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const vis = filters.showZones ? 'visible' : 'none';
    ['zones-fill', 'zones-outline', 'zones-labels'].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    });
  }, [mapLoaded, filters.showZones]);

  // ── Choropleth ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !mapData.zoneMetrics.length || !map.getLayer('zones-fill')) return;
    const matchExpr: any[] = ['match', ['get', 'name']];
    mapData.zoneMetrics.forEach(zm => matchExpr.push(zm.name, COVERAGE_COLORS[zm.coverage_status]));
    matchExpr.push('#3b82f6');
    map.setPaintProperty('zones-fill', 'fill-color', matchExpr as any);
    map.setPaintProperty('zones-fill', 'fill-opacity', 0.12);
    map.setPaintProperty('zones-outline', 'line-color', matchExpr as any);
  }, [mapLoaded, mapData.zoneMetrics]);

  // ── Assignment lines ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource('assignment-lines') as mapboxgl.GeoJSONSource;
    if (!src) return;
    const vis = filters.showLines ? 'visible' : 'none';
    if (map.getLayer('assignment-lines-layer')) map.setLayoutProperty('assignment-lines-layer', 'visibility', vis);
    if (!filters.showLines) return;
    src.setData({
      type: 'FeatureCollection',
      features: mapData.assignmentLines.map((line: any) => ({
        type: 'Feature' as const,
        properties: { color: LINE_COLORS[line.job_status] ?? '#94a3b8' },
        geometry: { type: 'LineString' as const, coordinates: [line.from, line.to] },
      })),
    });
  }, [mapLoaded, mapData.assignmentLines, filters.showLines]);

  // ── Markers + Auto-Frame ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const { jobs, contractorLocations, contractorHQs } = mapData;

    const filteredJobs = jobs.filter(job => {
      if (filters.status !== 'all' && job.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return job.address_line1?.toLowerCase().includes(q) ||
          job.customer?.full_name?.toLowerCase().includes(q) ||
          job.job_number?.toLowerCase().includes(q);
      }
      return true;
    });

    const filteredContractors = contractorLocations.filter(loc =>
      !filters.search || loc.contractor?.full_name?.toLowerCase().includes(filters.search.toLowerCase())
    );

    // Job markers
    const jobIds = new Set(filteredJobs.map((j: any) => j.id));
    Object.keys(jobMarkersRef.current).forEach(id => {
      if (!jobIds.has(id) || !filters.showJobs) { jobMarkersRef.current[id].remove(); delete jobMarkersRef.current[id]; }
    });
    if (filters.showJobs) {
      filteredJobs.forEach((job: any) => {
        if (!job.longitude || !job.latitude) return;
        const popupHtml = `<div style="font-family:system-ui,sans-serif;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="background:${STATUS_COLORS[job.status] ?? STATUS_COLORS.default};color:#fff;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;">${STATUS_LABELS[job.status] ?? job.status}</span>
            <span style="font-size:10px;color:#888;">${job.job_number}</span>
          </div>
          <p style="font-weight:800;font-size:14px;margin:0 0 2px;color:#fff;">${job.customer?.full_name ?? 'Unknown'}</p>
          <p style="font-size:11px;color:#999;margin:0 0 8px;">${job.address_line1}, ${job.city}</p>
          <div style="display:flex;justify-content:space-between;background:#111;padding:6px 8px;border-radius:8px;margin-bottom:6px;">
            <span style="font-size:11px;color:#aaa;">${(job.service_type ?? '').replace(/_/g, ' ')}</span>
            <span style="font-size:13px;font-weight:800;color:#22c55e;">$${(job.final_price ?? job.quoted_price)?.toFixed(0) ?? '—'}</span>
          </div>
          ${job.contractor ? `<p style="font-size:10px;color:#666;">Assigned: <strong style="color:#bbb">${job.contractor.full_name}</strong></p>` : ''}
          <a href="/wegettinmoneynga/jobs/${job.id}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#60a5fa;margin-top:6px;text-decoration:none;font-weight:700;">View Job Details ↗</a>
        </div>`;
        if (!jobMarkersRef.current[job.id]) {
          const el = mkJobMarker(job.status);
          jobMarkersRef.current[job.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([job.longitude, job.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 14, closeButton: true, maxWidth: '280px' }).setHTML(popupHtml))
            .addTo(map);
        } else {
          jobMarkersRef.current[job.id].setLngLat([job.longitude, job.latitude]);
        }
      });
    }

    // Contractor markers
    const locIds = new Set(filteredContractors.map((l: any) => l.id));
    Object.keys(locMarkersRef.current).forEach(id => {
      if (!locIds.has(id) || !filters.showContractors) { locMarkersRef.current[id].remove(); delete locMarkersRef.current[id]; }
    });
    if (filters.showContractors) {
      filteredContractors.forEach((loc: any) => {
        if (!loc.longitude || !loc.latitude) return;
        const c = loc.contractor;
        const popupHtml = `<div style="font-family:system-ui,sans-serif;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <div style="width:7px;height:7px;background:#22c55e;border-radius:50%;"></div>
            <span style="font-size:10px;color:#22c55e;font-weight:800;">LIVE</span>
          </div>
          <p style="font-weight:800;font-size:14px;margin:0 0 2px;color:#fff;">${c?.full_name ?? 'Contractor'}</p>
          <p style="font-size:10px;color:#999;margin:0 0 6px;text-transform:capitalize;">${c?.tier ?? ''} Tier</p>
          ${c?.phone ? `<p style="font-size:10px;color:#666;margin:0 0 6px;">📞 ${c.phone}</p>` : ''}
          <a href="/wegettinmoneynga/contractors/${c?.id}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#60a5fa;text-decoration:none;font-weight:700;">View Profile ↗</a>
        </div>`;
        if (!locMarkersRef.current[loc.id]) {
          locMarkersRef.current[loc.id] = new mapboxgl.Marker({ element: mkContractorMarker() })
            .setLngLat([loc.longitude, loc.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: '240px' }).setHTML(popupHtml))
            .addTo(map);
        } else {
          locMarkersRef.current[loc.id].setLngLat([loc.longitude, loc.latitude]);
        }
      });
    }

    // HQ markers
    const hqIds = new Set(contractorHQs.map((h: any) => h.id));
    Object.keys(hqMarkersRef.current).forEach(id => {
      if (!hqIds.has(id) || !filters.showHQs) { hqMarkersRef.current[id].remove(); delete hqMarkersRef.current[id]; }
    });
    if (filters.showHQs) {
      contractorHQs.forEach((hq: any) => {
        if (!hq.longitude || !hq.latitude) return;
        const popupHtml = `<div style="font-family:system-ui,sans-serif;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <div style="width:7px;height:7px;background:#1d4ed8;border-radius:2px;"></div>
            <span style="font-size:10px;color:#93c5fd;font-weight:800;">HEADQUARTERS</span>
          </div>
          <p style="font-weight:800;font-size:14px;margin:0 0 6px;color:#fff;">${hq.full_name}</p>
          <a href="/wegettinmoneynga/contractors/${hq.id}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#60a5fa;text-decoration:none;font-weight:700;">View Profile ↗</a>
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

    // Auto-frame ONLY ON FIRST DATA LOAD or when sidebar collapses initially
    if (!initialFrameDone.current && filteredJobs.length > 0) {
      const allCoords: [number, number][] = [
        ...filteredJobs.filter((j: any) => j.longitude && j.latitude).map((j: any) => [j.longitude, j.latitude] as [number, number]),
        ...filteredContractors.filter((l: any) => l.longitude && l.latitude).map((l: any) => [l.longitude, l.latitude] as [number, number]),
      ];
      if (allCoords.length >= 2) {
        const bounds = allCoords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));
        map.fitBounds(bounds, { padding: { top: 80, bottom: 100, left: 40, right: sidebarCollapsed ? 60 : 300 }, maxZoom: 14, duration: 800 });
        initialFrameDone.current = true;
      }
    }
  }, [mapLoaded, mapData, filters, sidebarCollapsed]);

  // ─── Derived ────────────────────────────────────────────────────────────────
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

  const layerToggles = [
    { key: 'showJobs' as const, label: 'Jobs', icon: Briefcase },
    { key: 'showContractors' as const, label: 'Live', icon: Radio },
    { key: 'showHQs' as const, label: 'HQs', icon: Home },
    { key: 'showZones' as const, label: 'Zones', icon: Map },
    { key: 'showLines' as const, label: 'Routes', icon: GitBranch },
  ];

  const sidebarWidth = sidebarCollapsed ? 44 : 280;

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-black overflow-hidden">
      {/* Map canvas — shrinks to leave room for sidebar */}
      <div
        ref={mapContainerRef}
        className="absolute top-0 left-0 bottom-0 transition-all duration-300"
        style={{ right: `${sidebarWidth}px` }}
      />

      {/* ── Unified Header Bar ─────────────────────────────────────────────────
          Single row: [← Dashboard] [Search] [Status pills] [Layer toggles] [Refresh]
          No z-index conflicts. Runs full-width minus sidebar. */}
      <div
        className="absolute top-0 left-0 z-20 flex items-center gap-2 px-3 py-2.5 bg-black/90 backdrop-blur-xl border-b border-white/10 transition-all duration-300"
        style={{ right: `${sidebarWidth}px` }}
      >
        {/* Back to Dashboard */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 border border-white/10 rounded-lg text-white/60 hover:text-white text-[11px] font-bold transition-colors shrink-0"
        >
          <List className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>

        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* Search */}
        <div className="relative min-w-[180px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/35 pointer-events-none" />
          <input
            type="text"
            placeholder="Search jobs, customers..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-1.5 bg-white/6 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 shrink-0">
          {statusGroups.map(sg => (
            <button
              key={sg.key}
              onClick={() => setFilters(f => ({ ...f, status: sg.key }))}
              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all ${filters.status === sg.key ? 'text-white' : 'text-white/30 hover:text-white/55'}`}
              style={filters.status === sg.key ? { background: sg.color } : {}}
            >
              {sg.label}
            </button>
          ))}
        </div>

        {/* Layer toggles */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 shrink-0">
          {layerToggles.map(lt => (
            <button
              key={lt.key}
              onClick={() => setFilters(f => ({ ...f, [lt.key]: !f[lt.key] }))}
              title={lt.label}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${filters[lt.key] ? 'bg-blue-600/80 text-white' : 'text-white/30 hover:text-white/55'}`}
            >
              <lt.icon className="h-3 w-3" />
              <span>{lt.label}</span>
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white transition-colors shrink-0"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Bottom Metrics Strip ───────────────────────────────────────────────── */}
      <div
        className="absolute bottom-8 left-3 z-20 flex items-center gap-1.5 overflow-x-auto scrollbar-none transition-all duration-300"
        style={{ right: `${sidebarWidth + 12}px` }}
      >
        {[
          { label: 'Jobs Today', value: metrics.jobsToday, icon: Briefcase, color: 'text-blue-400' },
          { label: 'Revenue', value: `$${metrics.revenueToday.toFixed(0)}`, icon: DollarSign, color: 'text-green-400' },
          { label: 'Live', value: metrics.contractorsOnline, icon: Radio, color: 'text-emerald-400' },
          { label: 'Active', value: metrics.active, icon: Zap, color: 'text-purple-400' },
          { label: 'Done', value: metrics.completed, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Issues', value: metrics.issues, icon: AlertTriangle, color: 'text-red-400' },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-2 bg-black/85 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shrink-0">
            <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
            <div>
              <p className="text-white font-black text-sm leading-none">{m.value}</p>
              <p className="text-white/35 text-[9px] font-bold uppercase tracking-wider mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Last refresh */}
      <div className="absolute bottom-2 left-3 z-20 text-white/20 text-[10px]">
        Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Auto-refresh 30s
      </div>

      {/* ── Zone Intelligence Sidebar ──────────────────────────────────────────── */}
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
