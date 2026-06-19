'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@/lib/supabase/client';
import {
  Search, RefreshCw, Radio, Briefcase,
  DollarSign, Zap, AlertTriangle, CheckCircle,
  Users, Home, GitBranch, Map, ExternalLink,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

// ─── Color Config ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  lead_received: '#f97316',
  quoted:        '#fb923c',
  confirmed:     '#3b82f6',
  offered:       '#3b82f6',
  assigned:      '#eab308',
  on_the_way:    '#8b5cf6',
  in_progress:   '#8b5cf6',
  completed:     '#22c55e',
  disputed:      '#ef4444',
  refunded:      '#ef4444',
  cancelled:     '#6b7280',
  default:       '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  lead_received: 'Lead',     quoted: 'Quoted',
  confirmed:     'Confirmed', offered: 'Offered',
  assigned:      'Assigned',  on_the_way: 'En Route',
  in_progress:   'In Progress', completed: 'Completed',
  disputed:      'Disputed',  refunded: 'Refunded',
  cancelled:     'Cancelled',
};

const COVERAGE_COLORS: Record<string, string> = {
  high:   '#22c55e',
  medium: '#eab308',
  low:    '#ef4444',
  idle:   '#475569',
};

const LINE_COLORS: Record<string, string> = {
  assigned:    '#eab308',
  on_the_way:  '#8b5cf6',
  in_progress: '#8b5cf6',
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

function mkContractorMarker(isOnline: boolean) {
  const el = document.createElement('div');
  el.style.cssText = 'width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
  const inner = document.createElement('div');
  inner.style.cssText = `width:100%;height:100%;background:#0a0a0a;border:2.5px solid ${isOnline ? '#22c55e' : 'rgba(255,255,255,.85)'};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.7);transition:transform .15s ease;font-size:13px;`;
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

// ─── Zone Intelligence Panel (rendered as React component) ────────────────────
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
}

function ZonePanel({ metric, onClose }: { metric: ZoneMetric; onClose: () => void }) {
  const coverageColor = COVERAGE_COLORS[metric.coverage_status];
  const coverageLabel = metric.coverage_status.charAt(0).toUpperCase() + metric.coverage_status.slice(1);
  const CoverageIcon = metric.coverage_status === 'high' ? TrendingUp
    : metric.coverage_status === 'low' ? TrendingDown
    : Minus;

  return (
    <div className="absolute top-4 right-4 z-30 w-72 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <p className="text-white font-black text-sm">{metric.name}</p>
          <p className="text-white/40 text-xs mt-0.5">{metric.city} · Service Zone</p>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none transition-colors">✕</button>
      </div>

      {/* Coverage Badge */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Coverage</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black" style={{ background: coverageColor + '22', color: coverageColor }}>
            <CoverageIcon className="h-3 w-3" />
            {coverageLabel}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/10">
        {[
          { label: 'Jobs Today',     value: metric.total_jobs_today,               icon: Briefcase,    color: 'text-blue-400' },
          { label: 'Active Now',     value: metric.active_jobs,                    icon: Zap,          color: 'text-purple-400' },
          { label: 'Completed',      value: metric.completed_jobs,                 icon: CheckCircle,  color: 'text-green-400' },
          { label: 'Assigned',       value: metric.assigned_jobs,                  icon: GitBranch,    color: 'text-yellow-400' },
          { label: 'Revenue Today',  value: `$${metric.total_revenue.toFixed(0)}`, icon: DollarSign,   color: 'text-green-400' },
          { label: 'Active Revenue', value: `$${metric.active_revenue.toFixed(0)}`, icon: TrendingUp,  color: 'text-emerald-400' },
          { label: 'Total Ctrs.',   value: metric.total_contractors,               icon: Users,        color: 'text-slate-400' },
          { label: 'Online Now',    value: metric.online_contractors,              icon: Radio,        color: 'text-emerald-400' },
        ].map(m => (
          <div key={m.label} className="bg-black/40 p-3 flex items-center gap-2.5">
            <m.icon className={`h-4 w-4 shrink-0 ${m.color}`} />
            <div>
              <p className="text-white font-black text-sm leading-none">{m.value}</p>
              <p className="text-white/30 text-[9px] uppercase tracking-wider mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Demand Alert */}
      {metric.coverage_status === 'low' && metric.active_jobs > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-900/30">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-xs">
            High demand in this zone — {metric.active_jobs} active job{metric.active_jobs > 1 ? 's' : ''} with only {metric.online_contractors} contractor{metric.online_contractors !== 1 ? 's' : ''} online.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
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

export default function DispatchMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const jobMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const locMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const hqMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapToken, setMapToken] = useState('');
  const [mapData, setMapData] = useState<MapData>({ jobs: [], contractorLocations: [], contractorHQs: [], zoneMetrics: [], assignmentLines: [] });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedZone, setSelectedZone] = useState<ZoneMetric | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all', search: '',
    showJobs: true, showContractors: true, showHQs: true, showZones: true, showLines: true,
  });

  const supabase = createClient();

  // ── Data Fetch ──────────────────────────────────────────────────────────────
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
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('dispatch-map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_locations' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData, supabase]);

  // ── Token / Map Init ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(cfg => {
      if (cfg.mapboxToken) setMapToken(cfg.mapboxToken);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapToken) return;
    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-79.3832, 43.6532],
      zoom: 9.5,
      pitch: 0,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    mapRef.current = map;

    map.on('load', () => {
      // ── Add zone polygon layer from pre-built GeoJSON ──────────────────────
      map.addSource('zones-source', {
        type: 'geojson',
        data: '/zones.geojson',
      });

      // Filled polygons (choropleth-ready — color driven by feature-state later)
      map.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones-source',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.07,
        },
      });

      // Stroke outline
      map.addLayer({
        id: 'zones-outline',
        type: 'line',
        source: 'zones-source',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 1.5,
          'line-opacity': 0.5,
        },
      });

      // Zone name labels at centroid
      map.addLayer({
        id: 'zones-labels',
        type: 'symbol',
        source: 'zones-source',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          'text-max-width': 8,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': 'rgba(148,163,184,0.7)',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1,
        },
      });

      // ── Assignment Lines layer (GeoJSON updated dynamically) ──────────────
      map.addSource('assignment-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'assignment-lines-layer',
        type: 'line',
        source: 'assignment-lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-dasharray': [3, 3],
          'line-opacity': 0.7,
        },
      });

      // Zone polygon click handler
      map.on('click', 'zones-fill', (e) => {
        const zoneName = e.features?.[0]?.properties?.name;
        // find matching zone metric
        setSelectedZone(prev => {
          // will be updated from state in the marker effect
          return null; // temp: will be resolved below
        });
        // Dispatch custom event with zone name for the React state handler
        window.dispatchEvent(new CustomEvent('zone-click', { detail: { name: zoneName } }));
      });

      map.on('mouseenter', 'zones-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'zones-fill', () => { map.getCanvas().style.cursor = ''; });

      map.resize();
      setMapLoaded(true);
    });

    map.on('style.load', () => map.resize());
    setTimeout(() => map.resize(), 500);
    return () => { map.remove(); mapRef.current = null; };
  }, [mapToken]);

  // ── Handle zone clicks via custom event ────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent).detail?.name;
      const found = mapData.zoneMetrics.find(z => z.name === name);
      setSelectedZone(found ?? null);
    };
    window.addEventListener('zone-click', handler);
    return () => window.removeEventListener('zone-click', handler);
  }, [mapData.zoneMetrics]);

  // ── Update zone layer visibility ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const vis = filters.showZones ? 'visible' : 'none';
    ['zones-fill', 'zones-outline', 'zones-labels'].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    });
  }, [mapLoaded, filters.showZones]);

  // ── Choropleth zone coloring based on metrics ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || mapData.zoneMetrics.length === 0) return;
    if (!map.getLayer('zones-fill')) return;

    // Build a match expression to color zones by coverage status
    const matchExpr: any[] = ['match', ['get', 'name']];
    mapData.zoneMetrics.forEach(zm => {
      matchExpr.push(zm.name, COVERAGE_COLORS[zm.coverage_status]);
    });
    matchExpr.push('#3b82f6'); // default

    map.setPaintProperty('zones-fill', 'fill-color', matchExpr as any);
    map.setPaintProperty('zones-fill', 'fill-opacity', 0.12);
    map.setPaintProperty('zones-outline', 'line-color', matchExpr as any);
  }, [mapLoaded, mapData.zoneMetrics]);

  // ── Update assignment lines ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource('assignment-lines') as mapboxgl.GeoJSONSource;
    if (!src) return;

    const vis = filters.showLines ? 'visible' : 'none';
    if (map.getLayer('assignment-lines-layer')) {
      map.setLayoutProperty('assignment-lines-layer', 'visibility', vis);
    }

    if (!filters.showLines) return;

    const features = mapData.assignmentLines.map((line: any) => ({
      type: 'Feature' as const,
      properties: { color: LINE_COLORS[line.job_status] ?? '#94a3b8' },
      geometry: { type: 'LineString' as const, coordinates: [line.from, line.to] },
    }));

    src.setData({ type: 'FeatureCollection', features });
  }, [mapLoaded, mapData.assignmentLines, filters.showLines]);

  // ── Render / update markers ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const { jobs, contractorLocations, contractorHQs } = mapData;

    // Filter jobs by status + search
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

    const filteredContractors = contractorLocations.filter(loc => {
      if (!filters.search) return true;
      const q = filters.search.toLowerCase();
      return loc.contractor?.full_name?.toLowerCase().includes(q);
    });

    // ── JOB markers ──────────────────────────────────────────────────────────
    const jobIds = new Set(filteredJobs.map(j => j.id));
    Object.keys(jobMarkersRef.current).forEach(id => {
      if (!jobIds.has(id) || !filters.showJobs) {
        jobMarkersRef.current[id].remove();
        delete jobMarkersRef.current[id];
      }
    });

    if (filters.showJobs) {
      filteredJobs.forEach(job => {
        if (!job.longitude || !job.latitude) return;
        const price = job.final_price ?? job.quoted_price;
        const popupHtml = `
          <div style="font-family:system-ui,sans-serif;padding:4px 2px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="background:${STATUS_COLORS[job.status] ?? STATUS_COLORS.default};color:#fff;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">${STATUS_LABELS[job.status] ?? job.status}</span>
              <span style="font-size:10px;color:#888;">${job.job_number}</span>
            </div>
            <p style="font-weight:800;font-size:14px;margin:0 0 2px;color:#fff;">${job.customer?.full_name ?? 'Unknown'}</p>
            <p style="font-size:11px;color:#999;margin:0 0 8px;">${job.address_line1}, ${job.city}</p>
            <div style="display:flex;justify-content:space-between;background:#111;padding:6px 8px;border-radius:8px;margin-bottom:6px;">
              <span style="font-size:11px;color:#aaa;text-transform:capitalize;">${(job.service_type ?? '').replace(/_/g, ' ')}</span>
              <span style="font-size:13px;font-weight:800;color:#22c55e;">$${price?.toFixed(0) ?? '—'}</span>
            </div>
            ${job.contractor ? `<p style="font-size:10px;color:#666;">Assigned: <strong style="color:#bbb">${job.contractor.full_name}</strong></p>` : ''}
            <a href="/wegettinmoneynga/jobs/${job.id}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#60a5fa;margin-top:6px;text-decoration:none;font-weight:700;">View Job Details ↗</a>
          </div>`;

        if (!jobMarkersRef.current[job.id]) {
          const el = mkJobMarker(job.status);
          const popup = new mapboxgl.Popup({ offset: 14, closeButton: true, maxWidth: '280px' }).setHTML(popupHtml);
          jobMarkersRef.current[job.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([job.longitude, job.latitude])
            .setPopup(popup)
            .addTo(map);
        } else {
          jobMarkersRef.current[job.id].setLngLat([job.longitude, job.latitude]);
        }
      });
    }

    // ── CONTRACTOR LOCATION markers ──────────────────────────────────────────
    const locIds = new Set(filteredContractors.map(l => l.id));
    Object.keys(locMarkersRef.current).forEach(id => {
      if (!locIds.has(id) || !filters.showContractors) {
        locMarkersRef.current[id].remove();
        delete locMarkersRef.current[id];
      }
    });

    if (filters.showContractors) {
      filteredContractors.forEach(loc => {
        if (!loc.longitude || !loc.latitude) return;
        const c = loc.contractor;
        const popupHtml = `
          <div style="font-family:system-ui,sans-serif;padding:4px 2px;">
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
          const el = mkContractorMarker(true);
          const popup = new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: '240px' }).setHTML(popupHtml);
          locMarkersRef.current[loc.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([loc.longitude, loc.latitude])
            .setPopup(popup)
            .addTo(map);
        } else {
          locMarkersRef.current[loc.id].setLngLat([loc.longitude, loc.latitude]);
        }
      });
    }

    // ── HQ markers ───────────────────────────────────────────────────────────
    const hqIds = new Set(contractorHQs.map(h => h.id));
    Object.keys(hqMarkersRef.current).forEach(id => {
      if (!hqIds.has(id) || !filters.showHQs) {
        hqMarkersRef.current[id].remove();
        delete hqMarkersRef.current[id];
      }
    });

    if (filters.showHQs) {
      contractorHQs.forEach(hq => {
        if (!hq.longitude || !hq.latitude) return;
        const popupHtml = `
          <div style="font-family:system-ui,sans-serif;padding:4px 2px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <div style="width:7px;height:7px;background:#1d4ed8;border-radius:2px;"></div>
              <span style="font-size:10px;color:#93c5fd;font-weight:800;">HEADQUARTERS</span>
            </div>
            <p style="font-weight:800;font-size:14px;margin:0 0 2px;color:#fff;">${hq.full_name}</p>
            ${hq.phone ? `<p style="font-size:10px;color:#666;margin:0 0 6px;">📞 ${hq.phone}</p>` : ''}
            <a href="/wegettinmoneynga/contractors/${hq.id}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#60a5fa;text-decoration:none;font-weight:700;">View Profile ↗</a>
          </div>`;

        if (!hqMarkersRef.current[hq.id]) {
          const el = mkHQMarker();
          const popup = new mapboxgl.Popup({ offset: 18, closeButton: true, maxWidth: '240px' }).setHTML(popupHtml);
          hqMarkersRef.current[hq.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([hq.longitude, hq.latitude])
            .setPopup(popup)
            .addTo(map);
        } else {
          hqMarkersRef.current[hq.id].setLngLat([hq.longitude, hq.latitude]);
        }
      });
    }

    // ── Auto-Frame: fitBounds around all visible entities ────────────────────
    const allCoords: [number, number][] = [
      ...filteredJobs.filter(j => j.longitude && j.latitude).map(j => [j.longitude, j.latitude] as [number, number]),
      ...filteredContractors.filter(l => l.longitude && l.latitude).map(l => [l.longitude, l.latitude] as [number, number]),
    ];

    if (allCoords.length >= 2) {
      const bounds = allCoords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));
      map.fitBounds(bounds, { padding: { top: 80, bottom: 120, left: 40, right: selectedZone ? 310 : 40 }, maxZoom: 14, duration: 800 });
    }

  }, [mapLoaded, mapData, filters, selectedZone]);

  // ─── Derived Metrics ───────────────────────────────────────────────────────
  const metrics = {
    jobsToday:          mapData.jobs.length,
    revenueToday:       mapData.jobs.reduce((s, j) => s + (j.quoted_price || 0), 0),
    contractorsOnline:  mapData.contractorLocations.length,
    active:             mapData.jobs.filter(j => ['on_the_way', 'in_progress'].includes(j.status)).length,
    completed:          mapData.jobs.filter(j => j.status === 'completed').length,
    issues:             mapData.jobs.filter(j => ['disputed', 'refunded'].includes(j.status)).length,
    lowCoverageZones:   mapData.zoneMetrics.filter(z => z.coverage_status === 'low').length,
  };

  const statusGroups = [
    { key: 'all',         label: 'All',         color: '#94a3b8' },
    { key: 'confirmed',   label: 'Confirmed',   color: STATUS_COLORS.confirmed },
    { key: 'on_the_way',  label: 'En Route',    color: STATUS_COLORS.on_the_way },
    { key: 'in_progress', label: 'In Progress', color: STATUS_COLORS.in_progress },
    { key: 'completed',   label: 'Done',        color: STATUS_COLORS.completed },
    { key: 'disputed',    label: 'Issues',      color: STATUS_COLORS.disputed },
  ];

  const layerToggles = [
    { key: 'showJobs',        label: 'Jobs',      icon: Briefcase },
    { key: 'showContractors', label: 'Live',      icon: Radio },
    { key: 'showHQs',         label: 'HQs',       icon: Home },
    { key: 'showZones',       label: 'Zones',     icon: Map },
    { key: 'showLines',       label: 'Routes',    icon: GitBranch },
  ] as const;

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-black overflow-hidden">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      {/* ── Top Toolbar ──────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap max-w-[calc(100%-300px)]">
        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Jobs, customers, contractors..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2.5 bg-black/80 backdrop-blur border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 bg-black/80 backdrop-blur border border-white/10 rounded-xl px-2 py-1.5">
          {statusGroups.map(sg => (
            <button
              key={sg.key}
              onClick={() => setFilters(f => ({ ...f, status: sg.key }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${filters.status === sg.key ? 'text-white' : 'text-white/35 hover:text-white/60'}`}
              style={filters.status === sg.key ? { background: sg.color } : {}}
            >
              {sg.label}
            </button>
          ))}
        </div>

        {/* Layer toggles */}
        <div className="flex items-center gap-1 bg-black/80 backdrop-blur border border-white/10 rounded-xl px-2 py-1.5">
          {layerToggles.map(lt => {
            const active = filters[lt.key];
            return (
              <button
                key={lt.key}
                onClick={() => setFilters(f => ({ ...f, [lt.key]: !f[lt.key] }))}
                title={lt.label}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${active ? 'bg-blue-600/80 text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                <lt.icon className="h-3.5 w-3.5" />
                <span>{lt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="p-2.5 bg-black/80 backdrop-blur border border-white/10 rounded-xl text-white/50 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Zone Intelligence Panel ───────────────────────────────────────────── */}
      {selectedZone && (
        <ZonePanel metric={selectedZone} onClose={() => setSelectedZone(null)} />
      )}

      {/* ── Bottom Metrics Strip ─────────────────────────────────────────────── */}
      <div className="absolute bottom-12 left-4 right-4 z-20 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {[
          { label: 'Jobs Today',      value: metrics.jobsToday,                          icon: Briefcase,    color: 'text-blue-400' },
          { label: 'Revenue',         value: `$${metrics.revenueToday.toFixed(0)}`,      icon: DollarSign,   color: 'text-green-400' },
          { label: 'Live Ctrs.',     value: metrics.contractorsOnline,                  icon: Radio,        color: 'text-emerald-400' },
          { label: 'Active Jobs',    value: metrics.active,                             icon: Zap,          color: 'text-purple-400' },
          { label: 'Completed',      value: metrics.completed,                          icon: CheckCircle,  color: 'text-green-400' },
          { label: 'Issues',         value: metrics.issues,                             icon: AlertTriangle,color: 'text-red-400' },
          { label: 'Low Coverage',   value: metrics.lowCoverageZones,                   icon: TrendingDown, color: metrics.lowCoverageZones > 0 ? 'text-red-400' : 'text-slate-500' },
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

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-32 left-4 z-20 bg-black/85 backdrop-blur border border-white/10 rounded-xl p-3 space-y-1.5">
        <p className="text-[9px] text-white/35 font-black uppercase tracking-widest mb-2">Legend</p>
        {[
          { dot: STATUS_COLORS.confirmed,   label: 'Confirmed' },
          { dot: STATUS_COLORS.on_the_way,  label: 'En Route' },
          { dot: STATUS_COLORS.in_progress, label: 'In Progress' },
          { dot: STATUS_COLORS.completed,   label: 'Completed' },
          { dot: STATUS_COLORS.disputed,    label: 'Issue' },
          { dot: '#0a0a0a', label: 'Contractor', border: true },
          { dot: '#1e3a8a', label: 'HQ', square: true },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2">
            <div style={{
              width: 9, height: 9,
              background: l.dot,
              borderRadius: l.square ? '2px' : '50%',
              border: l.border ? '2px solid rgba(255,255,255,0.7)' : undefined,
              boxShadow: '0 1px 4px rgba(0,0,0,.5)',
              flexShrink: 0,
            }} />
            <span className="text-white/50 text-[10px] font-medium">{l.label}</span>
          </div>
        ))}
        <div className="pt-1 border-t border-white/10 space-y-1">
          <p className="text-[9px] text-white/35 font-black uppercase tracking-widest">Zone Coverage</p>
          {[
            { color: COVERAGE_COLORS.high,   label: 'High' },
            { color: COVERAGE_COLORS.medium, label: 'Medium' },
            { color: COVERAGE_COLORS.low,    label: 'Low (Alert)' },
            { color: COVERAGE_COLORS.idle,   label: 'Idle' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div style={{ width: 16, height: 6, background: l.color + '33', border: `1px solid ${l.color}`, borderRadius: 2 }} />
              <span className="text-white/50 text-[10px]">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last refresh */}
      <div className="absolute bottom-3 left-4 z-20 text-white/25 text-[10px]">
        Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Auto-refresh 30s
      </div>
    </div>
  );
}
