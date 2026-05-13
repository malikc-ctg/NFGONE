'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SeaOfBlueMap } from '@/components/shared/SeaOfBlueMap';
import { JobPin } from './JobPin';
import { ContractorDot } from './ContractorDot';
import { JobDetailDrawer } from './JobDetailDrawer';
import { DashboardSummaryPanel } from './DashboardSummaryPanel';
import { ZoneLayers } from './ZoneLayers';
import { DispatchModal } from './DispatchModal';
import type { Job, Contractor, ContractorLocation } from '@/types';
import { format } from 'date-fns';

export function AdminMapDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorLocations, setContractorLocations] = useState<Map<string, ContractorLocation>>(new Map());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dispatchJob, setDispatchJob] = useState<Job | null>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const supabaseRef = useRef(supabase);
  useEffect(() => { supabaseRef.current = supabase; }, [supabase]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [jobsRes, contractorsRes, locationsRes, zonesRes] = await Promise.all([
        // Today's jobs with geocoded positions
        fetch(`/api/jobs?date=${today}`),
        // All active contractors
        fetch('/api/contractors'),
        // Active contractor locations
        supabase
          .from('contractor_locations')
          .select('*, contractor:contractors(id, full_name, tier, score, zone_id)')
          .eq('is_active', true),
        // Zone boundaries
        supabase
          .from('zone_boundaries')
          .select('*, zone:zones(id, name, city)')
      ]);

      const jobsData = await jobsRes.json();
      setJobs(Array.isArray(jobsData) ? jobsData : []);

      const contractorsData = await contractorsRes.json();
      setContractors(Array.isArray(contractorsData) ? contractorsData : []);

      // Set initial contractor locations
      if (locationsRes.data) {
        const locMap = new Map<string, ContractorLocation>();
        locationsRes.data.forEach((loc: Record<string, unknown>) => {
          locMap.set(loc.contractor_id as string, loc as any);
        });
        setContractorLocations(locMap);
      }

      // Set zone boundaries
      if (zonesRes.data) {
        setZones(
          zonesRes.data
            .filter((zb: any) => zb.geojson)
            .map((zb: Record<string, unknown>) => ({
              id: zb.zone_id,
              name: (zb.zone as any)?.name ?? '',
              geojson: zb.geojson,
              color: '',
            }))
        );
      }

      setLoading(false);
    };

    loadData();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    // Subscribe to job status changes
    const jobChannel = supabaseRef.current
      .channel('admin-jobs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
      }, (payload: unknown) => {
        setJobs(prev => {
          const updated = prev.filter(j => j.id !== payload.new?.id);
          if (payload.eventType !== 'DELETE' && payload.new) {
            return [...updated, payload.new as Job];
          }
          return updated;
        });
      })
      .subscribe();

    // Subscribe to contractor location updates
    const locationChannel = supabase
      .channel('contractor-locations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contractor_locations',
        filter: 'is_active=eq.true',
      }, (payload: any) => {
        if (payload.new) {
          setContractorLocations(prev => {
            const updated = new Map(prev);
            updated.set(payload.new.contractor_id, payload.new as ContractorLocation);
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(jobChannel);
      supabase.removeChannel(locationChannel);
    };
  }, []);

  // Find contractor for a given location
  const getContractorForLocation = useCallback((contractorId: string): Contractor => {
    const found = contractors.find(c => c.id === contractorId);
    if (found) return found;
    // Fallback: construct minimal contractor from location data
    return {
      id: contractorId,
      full_name: '?',
      email: '',
      phone: '',
      profile_id: null,
      zone_id: null,
      tier: 'basic',
      status: 'active',
      payout_rate: 0.7,
      brings_own_supplies: false,
      has_vehicle: true,
      max_jobs_per_day: 2,
      score: 5,
      stripe_account_id: null,
      background_check_cleared: false,
      insurance_on_file: false,
      notes: null,
      created_at: '',
      updated_at: '',
    } as Contractor;
  }, [contractors]);

  const handleDispatch = (job: Job) => {
    setSelectedJob(null);
    setDispatchJob(job);
  };

  if (loading) {
    return (
      <div style={{
        height: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: 14,
      }}>
        Loading operations map...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 60px)' }}>
      <SeaOfBlueMap>
        {/* Zone boundary overlays */}
        {zones.length > 0 && <ZoneLayers zones={zones} />}

        {/* Today's job pins */}
        {jobs.map(job => (
          <JobPin key={job.id} job={job} onSelect={setSelectedJob} />
        ))}

        {/* Live contractor positions */}
        {Array.from(contractorLocations.values()).map(loc => (
          <ContractorDot
            key={loc.contractor_id}
            contractor={getContractorForLocation(loc.contractor_id)}
            location={loc}
            isOnActiveJob={jobs.some(j =>
              j.assigned_contractor_id === loc.contractor_id &&
              ['on_the_way', 'in_progress'].includes(j.status)
            )}
          />
        ))}
      </SeaOfBlueMap>

      {/* Floating summary panel */}
      <DashboardSummaryPanel
        jobs={jobs}
        contractorCount={contractorLocations.size}
      />

      {/* Job detail drawer — slides in from right on pin select */}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onDispatch={handleDispatch}
        />
      )}

      {/* Dispatch modal — full-screen map overlay */}
      {dispatchJob && (
        <DispatchModal
          job={dispatchJob}
          contractorLocations={contractorLocations}
          onClose={() => setDispatchJob(null)}
        />
      )}
    </div>
  );
}
