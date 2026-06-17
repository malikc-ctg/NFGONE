'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { 
  Briefcase, Radio, AlertCircle, 
  Search, MapPin, Clock, 
  ArrowRight, CheckCircle2, Waves,
  TrendingUp, Calendar, Globe, Map, List
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { Job, Contractor, Zone } from '@/types';

const DispatchMap = dynamic(() => import('./DispatchMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-64px)] bg-black/90 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 text-xs">Initializing dispatch map...</p>
      </div>
    </div>
  ),
});


export function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  
  const supabase = createClient();
  const supabaseRef = useRef(supabase);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {

    const loadData = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [jobsRes, contractorsRes, zonesRes] = await Promise.all([
        fetch(`/api/jobs?date=${today}`),
        fetch('/api/contractors'),
        fetch('/api/zones')
      ]);

      const jobsData = await jobsRes.json();
      setJobs(Array.isArray(jobsData) ? jobsData : []);

      const contractorsData = await contractorsRes.json();
      setContractors(Array.isArray(contractorsData) ? contractorsData : []);

      const zonesData = await zonesRes.json();
      setZones(Array.isArray(zonesData) ? zonesData : []);

      setLoading(false);
    };

    loadData();
  }, []);

  // ... (realtime updates remains the same)
  useEffect(() => {
    const channel = supabaseRef.current
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload: any) => {
        const newRecord = payload.new as Job;
        const eventType = payload.eventType;
        
        setJobs(prev => {
          const filtered = prev.filter(j => j.id !== newRecord.id);
          if (eventType === 'DELETE') return filtered;
          return [newRecord, ...filtered];
        });
      })
      .subscribe();

    return () => { supabaseRef.current.removeChannel(channel); };
  }, []);

  const metrics = [
    { label: 'Jobs Today', value: jobs.length, icon: Briefcase, color: 'blue' },
    { label: 'Active Now', value: jobs.filter(j => ['on_the_way', 'in_progress'].includes(j.status)).length, icon: Radio, color: 'green' },
    { label: 'Dispatch Queue', value: jobs.filter(j => j.status === 'confirmed' && !j.assigned_contractor_id).length, icon: AlertCircle, color: 'orange' },
    { label: 'Revenue Today', value: `$${jobs.reduce((acc, j) => acc + (j.quoted_price || 0), 0).toFixed(0)}`, icon: TrendingUp, color: 'purple' },
  ];

  const filteredJobs = jobs.filter(j => 
    j.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.address_line1?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground animate-pulse">
      </div>
    );
  }

  if (view === 'map') {
    return (
      <div className="relative">
        {/* Map view header strip */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur border border-white/10 rounded-xl text-white/60 hover:text-white text-xs font-bold transition-colors"
          >
            <List className="h-3.5 w-3.5" />
            List View
          </button>
        </div>
        <DispatchMap />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Operational Overview</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('map')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <Map className="h-3.5 w-3.5" />
            Operations Map
          </button>
          <div className="sm:text-right">
            <p className="text-sm font-medium text-foreground">
              {isClient ? format(new Date(), 'EEEE, MMMM do') : '...'}
            </p>
            <p className="text-xs text-muted-foreground">Live updates enabled</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center
              ${m.color === 'blue' ? 'bg-blue-500/10 text-blue-600' : ''}
              ${m.color === 'green' ? 'bg-emerald-500/10 text-emerald-600' : ''}
              ${m.color === 'orange' ? 'bg-orange-500/10 text-orange-600' : ''}
              ${m.color === 'purple' ? 'bg-purple-500/10 text-purple-600' : ''}
            `}>
              <m.icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xl md:text-3xl font-bold tracking-tight text-foreground">{m.value}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Job List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              Today&apos;s Jobs
              <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                {jobs.length}
              </span>
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search jobs..."
                className="w-full pl-9 pr-4 py-2 bg-muted/50 border-none rounded-xl text-sm focus:ring-2 ring-blue-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <div key={job.id} className="group bg-card border border-border rounded-2xl p-4 md:p-5 hover:border-blue-500/50 transition-all cursor-pointer shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-foreground text-sm md:text-base truncate">{job.customer?.full_name || 'New Booking'}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter shrink-0
                            ${job.status === 'in_progress' ? 'bg-emerald-100 text-emerald-700' : ''}
                            ${job.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : ''}
                            ${job.status === 'on_the_way' ? 'bg-sky-100 text-sky-700' : ''}
                            ${job.status === 'lead_received' ? 'bg-orange-100 text-orange-700' : ''}
                          `}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">{job.address_line1}</p>
                        <div className="flex items-center gap-3 md:gap-4 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {job.scheduled_window || 'Morning'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{job.service_type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">${job.quoted_price?.toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest hidden sm:block">Revenue</p>
                      </div>
                      <div className="p-2 rounded-full hover:bg-muted text-muted-foreground group-hover:text-blue-600 transition-colors hidden sm:block">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-muted/20 rounded-3xl border border-dashed border-border">
                <p className="text-sm text-muted-foreground">No matching jobs found for today.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              Active Contractors
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <div className="space-y-4">
              {contractors.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase tracking-tighter">
                      {c.full_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{c.full_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">{c.tier} Tier</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </div>
                </div>
              ))}
              <button className="w-full py-3 mt-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all uppercase tracking-widest">
                View All Contractors
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-600">
              <Globe className="h-4 w-4" />
              Regional Coverage
            </h3>
            <div className="space-y-3">
              {zones.slice(0, 8).map((z) => (
                <div key={z.id} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{z.name}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{z.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-foreground">{z.areas?.length || 0} Areas</p>
                  </div>
                </div>
              ))}
              <Link href="/wegettinmoneynga/zones">
                <button className="w-full py-3 mt-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all uppercase tracking-widest border border-dashed border-border">
                  Manage GTA Zones
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

