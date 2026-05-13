'use client';

import { useEffect, useState } from 'react';
import { SeaOfBlueMap } from '@/components/shared/SeaOfBlueMap';
import { Marker, Source, Layer } from 'react-map-gl/mapbox';
import { fetchETA } from '@/lib/mapbox-directions';

interface JobRouteMapProps {
  jobLatitude: number;
  jobLongitude: number;
  jobAddress: string;
}

export function JobRouteMap({ jobLatitude, jobLongitude, jobAddress }: JobRouteMapProps) {
  const [route, setRoute] = useState<GeoJSON.LineString | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const result = await fetchETA(
          pos.coords.longitude, pos.coords.latitude,
          jobLongitude, jobLatitude
        );
        setRoute(result.route);
        setEta(result.minutes);
      } catch (err) {
        console.error('Route calculation failed:', err);
      }
    }, (err) => {
      console.warn('Could not get current position for route map:', err);
    });
  }, [jobLatitude, jobLongitude]);

  const openGoogleMaps = () => {
    const encoded = encodeURIComponent(jobAddress);
    window.open(`https://maps.google.com/?q=${encoded}`, '_blank');
  };

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        height: 200,
        marginBottom: 12,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={openGoogleMaps}
    >
      <SeaOfBlueMap
        initialViewState={{ longitude: jobLongitude, latitude: jobLatitude, zoom: 13 }}
      >
        {/* Job destination pin */}
        <Marker longitude={jobLongitude} latitude={jobLatitude} anchor="bottom">
          <div style={{
            width: 24,
            height: 24,
            background: '#1D9E75',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }} />
        </Marker>

        {/* Route line */}
        {route && (
          <Source type="geojson" data={{ type: 'Feature', geometry: route, properties: {} }}>
            <Layer
              id="contractor-route"
              type="line"
              paint={{
                'line-color': '#3B82F6',
                'line-width': 3,
                'line-opacity': 0.9,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}
      </SeaOfBlueMap>

      {/* ETA overlay */}
      {eta !== null && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          fontSize: 12,
          textAlign: 'center',
          fontWeight: 500,
        }}>
          {eta} min to job · tap for Google Maps
        </div>
      )}
    </div>
  );
}
