'use client';

import { Marker } from 'react-map-gl/mapbox';
import type { Contractor } from '@/types';

interface ContractorDotProps {
  contractor: Contractor;
  location: { latitude: number; longitude: number; heading?: number | null };
  isOnActiveJob: boolean;
}

export function ContractorDot({ contractor, location, isOnActiveJob }: ContractorDotProps) {
  return (
    <Marker
      longitude={location.longitude}
      latitude={location.latitude}
      anchor="center"
    >
      <div
        title={contractor.full_name}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: isOnActiveJob ? '#1D9E75' : '#3B82F6',
          border: '3px solid white',
          boxShadow: `0 2px 8px ${isOnActiveJob ? 'rgba(29,158,117,0.4)' : 'rgba(59,130,246,0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          color: 'white',
          transform: location.heading ? `rotate(${location.heading}deg)` : undefined,
          transition: 'all 0.3s ease',
        }}
      >
        {contractor.full_name.charAt(0)}
      </div>
    </Marker>
  );
}
