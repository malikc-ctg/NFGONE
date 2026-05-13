'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SeaOfBlueMap } from '@/components/shared/SeaOfBlueMap';
import { Marker, Source, Layer } from 'react-map-gl/mapbox';
import { fetchETA } from '@/lib/mapbox-directions';
import { Waves } from 'lucide-react';
import type { Job } from '@/types';

interface TrackingData {
  job: Job;
  contractor_name: string;
  contractor_location: { latitude: number; longitude: number; heading?: number | null } | null;
  eta_minutes: number | null;
  route_geometry: GeoJSON.LineString | null;
}

export default function TrackingPage() {
  const params = useParams();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const supabaseRef = useRef(supabase);
  useEffect(() => { supabaseRef.current = supabase; }, [supabase]);
  const contractorIdRef = useRef<string | null>(null);

  // Throttle ETA calls to avoid excessive Mapbox Directions API usage
  const lastEtaCall = useRef(0);
  const ETA_THROTTLE_MS = 15000; // 15 seconds between ETA recalculations

  const updateETA = useCallback(async (
    loc: { longitude: number; latitude: number },
    jobLng: number,
    jobLat: number
  ) => {
    const now = Date.now();
    if (now - lastEtaCall.current < ETA_THROTTLE_MS) return;
    lastEtaCall.current = now;

    try {
      const eta = await fetchETA(loc.longitude, loc.latitude, jobLng, jobLat);
      setData(prev => prev ? {
        ...prev,
        eta_minutes: eta.minutes,
        route_geometry: eta.route,
      } : null);
    } catch (err) {
      console.error('ETA calculation failed:', err);
    }
  }, []);

  useEffect(() => {
    const loadTracking = async () => {
      try {
        // Load job data via API
        const jobRes = await fetch(`/api/jobs?limit=1000`);
        const jobsData = await jobRes.json();
        const job = (Array.isArray(jobsData) ? jobsData : [])
          .find((j: any) => j.id === params.jobId);

        if (!job) {
          setLoading(false);
          return;
        }

        contractorIdRef.current = job.assigned_contractor_id;

        // Load contractor location
        let contractorLocation = null;
        if (job.assigned_contractor_id) {
          const { data: loc } = await supabase
            .from('contractor_locations')
            .select('*')
            .eq('contractor_id', job.assigned_contractor_id)
            .eq('is_active', true)
            .single();

          contractorLocation = loc;
        }

        const contractorName = ((job as unknown as Record<string, unknown>).contractor as any)?.full_name?.split(' ')[0] ?? 'Your cleaner';

        const trackingData: TrackingData = {
          job,
          contractor_name: contractorName,
          contractor_location: contractorLocation,
          eta_minutes: null,
          route_geometry: null,
        };

        setData(trackingData);

        // Calculate initial ETA
        if (contractorLocation && job.latitude && job.longitude) {
          const eta = await fetchETA(
            contractorLocation.longitude,
            contractorLocation.latitude,
            job.longitude,
            job.latitude
          );
          setData(prev => prev ? {
            ...prev,
            eta_minutes: eta.minutes,
            route_geometry: eta.route,
          } : null);
        }
      } catch (err) {
        console.error('Failed to load tracking data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTracking();
  }, [params.jobId]);

  // Subscribe to live contractor location updates
  useEffect(() => {
    if (!contractorIdRef.current) return;

    const channel = supabaseRef.current
      .channel(`tracking-${params.jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'contractor_locations',
        filter: `contractor_id=eq.${contractorIdRef.current}`,
      }, async (payload: any) => {
        const newLoc = payload.new;
        setData(prev => prev ? {
          ...prev,
          contractor_location: newLoc,
        } : null);

        // Recalculate ETA (throttled)
        if (data?.job?.latitude && data?.job?.longitude) {
          updateETA(newLoc, data.job.longitude, data.job.latitude);
        }
      })
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(channel);
    };
  }, [data?.job?.assigned_contractor_id, data?.job?.latitude, data?.job?.longitude, params.jobId, updateETA]);

  if (loading) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: '#F9FAFB',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: '#3B82F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Waves style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <p style={{ color: '#6B7280', fontSize: 14 }}>Loading tracking...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F9FAFB',
      }}>
        <p style={{ color: '#EF4444', fontSize: 14 }}>Booking not found</p>
      </div>
    );
  }

  const isOnTheWay = data.job.status === 'on_the_way';
  const isInProgress = data.job.status === 'in_progress';
  const isCompleted = ['completed', 'reviewed', 'paid_out'].includes(data.job.status);

  return (
    <div style={{ height: '100dvh', position: 'relative' }}>
      <SeaOfBlueMap
        initialViewState={{
          longitude: data.job.longitude ?? -79.3832,
          latitude: data.job.latitude ?? 43.6532,
          zoom: 13,
        }}
      >
        {/* Customer home pin */}
        {data.job.latitude && data.job.longitude && (
          <Marker longitude={data.job.longitude} latitude={data.job.latitude} anchor="bottom">
            <div style={{
              width: 32,
              height: 32,
              background: '#1D9E75',
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              border: '2.5px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }} />
          </Marker>
        )}

        {/* Contractor live position */}
        {data.contractor_location && isOnTheWay && (
          <Marker
            longitude={data.contractor_location.longitude}
            latitude={data.contractor_location.latitude}
            anchor="center"
            rotation={data.contractor_location.heading ?? 0}
          >
            <div style={{
              width: 40,
              height: 40,
              background: '#0EA5E9',
              borderRadius: '50%',
              border: '3px solid white',
              boxShadow: '0 2px 12px rgba(14,165,233,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 18,
            }}>
              ↑
            </div>
          </Marker>
        )}

        {/* Route line between contractor and home */}
        {data.route_geometry && isOnTheWay && (
          <Source
            type="geojson"
            data={{
              type: 'Feature',
              geometry: data.route_geometry,
              properties: {},
            }}
          >
            <Layer
              id="route"
              type="line"
              paint={{
                'line-color': '#0EA5E9',
                'line-width': 4,
                'line-opacity': 0.8,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}
      </SeaOfBlueMap>

      {/* Sea of Blue mini logo — top left */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        padding: '8px 14px',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: '#3B82F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Waves style={{ width: 14, height: 14, color: 'white' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Sea of Blue</span>
      </div>

      {/* Bottom status card (Uber-style pill that sits over the map) */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderRadius: '20px 20px 0 0',
        padding: '24px 24px 36px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        zIndex: 10,
      }}>
        {/* Drag handle */}
        <div style={{
          width: 36,
          height: 4,
          background: '#E5E7EB',
          borderRadius: 2,
          margin: '0 auto 16px',
        }} />

        {isOnTheWay && (
          <>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              On the way
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 4 }}>
              {data.contractor_name} is heading to you
            </div>
            {data.eta_minutes && (
              <div style={{
                fontSize: 15,
                color: '#1D9E75',
                marginTop: 8,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#1D9E75',
                  animation: 'pulse 2s infinite',
                }} />
                Arriving in approximately {data.eta_minutes} min
              </div>
            )}
          </>
        )}

        {isInProgress && (
          <>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              In progress
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 4 }}>
              {data.contractor_name} is cleaning your home
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>
              {data.job.service_type.replace(/_/g, ' ')} · {data.job.estimated_duration_minutes} min estimated
            </div>
          </>
        )}

        {isCompleted && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
              Clean complete ✨
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>
              How did everything go?
            </div>
            <a
              href={`/booking/${data.job.id}`}
              style={{
                display: 'block',
                marginTop: 16,
                background: '#1D9E75',
                color: 'white',
                textAlign: 'center',
                padding: '14px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Leave a review
            </a>
          </>
        )}

        {!isOnTheWay && !isInProgress && !isCompleted && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
              Your booking is being prepared
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              We&apos;ll notify you when your cleaner is on their way.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
