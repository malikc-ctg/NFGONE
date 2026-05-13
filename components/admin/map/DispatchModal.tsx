'use client';

import { useEffect, useState } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { SeaOfBlueMap } from '@/components/shared/SeaOfBlueMap';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { Job, Contractor, ContractorLocation } from '@/types';

interface DispatchModalProps {
  job: Job;
  contractorLocations: Map<string, ContractorLocation>;
  onClose: () => void;
}

interface RankedContractorItem {
  contractor: Contractor;
  dispatch_score: number;
  distance_km: number | null;
  jobs_today: number;
  location: ContractorLocation | null;
}

export function DispatchModal({ job, contractorLocations, onClose }: DispatchModalProps) {
  const [rankedContractors, setRankedContractors] = useState<RankedContractorItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    const loadContractors = async () => {
      try {
        const res = await fetch(
          `/api/contractors/available?date=${job.scheduled_date}&window=${job.scheduled_window}${job.zone_id ? `&zone_id=${job.zone_id}` : ''}`
        );
        const data = await res.json();
        const contractors: Contractor[] = Array.isArray(data) ? data : [];

        // Calculate distance if we have both job coords and contractor coords
        const ranked: RankedContractorItem[] = contractors.map(c => {
          const loc = contractorLocations.get(c.id) ?? null;
          let distance: number | null = null;

          if (loc && job.latitude && job.longitude) {
            // Haversine approximation
            const R = 6371; // km
            const dLat = (job.latitude - loc.latitude) * Math.PI / 180;
            const dLon = (job.longitude - loc.longitude) * Math.PI / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(loc.latitude * Math.PI / 180) *
              Math.cos(job.latitude * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          }

          // Composite dispatch score: score weight 0.5, distance weight 0.3, availability weight 0.2
          const scoreComponent = (c.score / 5) * 0.5;
          const distComponent = distance !== null ? Math.max(0, 1 - distance / 50) * 0.3 : 0.15;
          const availComponent = 0.2; // base availability (they passed filter)

          return {
            contractor: c,
            dispatch_score: scoreComponent + distComponent + availComponent,
            distance_km: distance,
            jobs_today: 0,
            location: loc,
          };
        });

        // Sort by dispatch score descending
        ranked.sort((a, b) => b.dispatch_score - a.dispatch_score);
        setRankedContractors(ranked);
      } catch (err) {
        console.error('Failed to load contractors:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContractors();
  }, [job, contractorLocations]);

  const handleSendOffers = async () => {
    if (selected.size === 0) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractor_ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error('Dispatch failed');
      toast.success(`Offers sent to ${selected.size} contractor${selected.size > 1 ? 's' : ''}`);
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to send offers');
    } finally {
      setDispatching(false);
    }
  };

  const toggleContractor = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
    }}>
      {/* Left panel: ranked contractor list */}
      <div
        style={{
          width: 384,
          background: 'white',
          boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
          overflowY: 'auto',
          padding: '20px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
            Dispatch {job.job_number}
          </h2>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {job.service_type.replace(/_/g, ' ')} · {job.scheduled_window.replace(/_/g, ' ')} · {job.city}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            {job.address_line1}
          </div>
        </div>

        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#9CA3AF',
          marginBottom: 8,
        }}>
          Available Contractors ({rankedContractors.length})
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ fontSize: 13, color: '#9CA3AF', padding: '20px 0', textAlign: 'center' }}>
              Loading contractors...
            </div>
          ) : rankedContractors.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9CA3AF', padding: '20px 0', textAlign: 'center' }}>
              No contractors available for this slot.
            </div>
          ) : (
            rankedContractors.map(({ contractor, dispatch_score, distance_km }) => (
              <div
                key={contractor.id}
                onClick={() => toggleContractor(contractor.id)}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: `1.5px solid ${selected.has(contractor.id) ? '#3B82F6' : '#E5E7EB'}`,
                  background: selected.has(contractor.id) ? '#EFF6FF' : 'white',
                  marginBottom: 8,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {contractor.full_name}
                  </div>
                  {distance_km !== null && (
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {distance_km.toFixed(1)} km
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#6B7280' }}>
                  <span>Score: {contractor.score.toFixed(1)}</span>
                  <span style={{ textTransform: 'capitalize' }}>{contractor.tier}</span>
                  <span>{contractor.brings_own_supplies ? 'Own supplies' : 'Needs supplies'}</span>
                </div>
                {/* Score bar */}
                <div style={{ marginTop: 6 }}>
                  <div style={{
                    height: 3,
                    background: '#F3F4F6',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: 3,
                      background: selected.has(contractor.id) ? '#3B82F6' : '#93C5FD',
                      borderRadius: 2,
                      width: `${dispatch_score * 100}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          disabled={selected.size === 0 || dispatching}
          onClick={handleSendOffers}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            background: selected.size === 0 ? '#E5E7EB' : '#3B82F6',
            color: selected.size === 0 ? '#9CA3AF' : 'white',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            opacity: dispatching ? 0.7 : 1,
          }}
        >
          {dispatching
            ? 'Sending...'
            : `Send offer to ${selected.size} contractor${selected.size !== 1 ? 's' : ''}`
          }
        </button>
      </div>

      {/* Right panel: map showing job + contractor positions */}
      <div style={{ flex: 1, position: 'relative' }}>
        <SeaOfBlueMap
          initialViewState={{
            longitude: job.longitude ?? -79.3832,
            latitude: job.latitude ?? 43.6532,
            zoom: 12,
          }}
        >
          {/* Job location pin */}
          {job.latitude && job.longitude && (
            <Marker longitude={job.longitude} latitude={job.latitude} anchor="bottom">
              <div style={{
                width: 36,
                height: 36,
                background: '#3B82F6',
                borderRadius: '50%',
                border: '3px solid white',
                boxShadow: '0 2px 12px rgba(59,130,246,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
              }}>
                J
              </div>
            </Marker>
          )}

          {/* Contractor positions */}
          {rankedContractors.map(({ contractor, location }) => {
            if (!location) return null;
            return (
              <Marker
                key={contractor.id}
                longitude={location.longitude}
                latitude={location.latitude}
                anchor="center"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleContractor(contractor.id);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: selected.has(contractor.id) ? '#10B981' : '#6B7280',
                    transform: selected.has(contractor.id) ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {contractor.full_name.charAt(0)}
                </div>
              </Marker>
            );
          })}
        </SeaOfBlueMap>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'white',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#6B7280',
          }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </div>
  );
}
