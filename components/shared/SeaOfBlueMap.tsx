'use client';

import Map, { NavigationControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { forwardRef } from 'react';

interface SeaOfBlueMapProps {
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  children?: React.ReactNode;
  onMapClick?: (coords: { lng: number; lat: number }) => void;
  style?: React.CSSProperties;
}

const DEFAULT_VIEW = {
  longitude: -79.3832,   // Toronto city center
  latitude: 43.6532,
  zoom: 11,
};

export const SeaOfBlueMap = forwardRef<MapRef, SeaOfBlueMapProps>(
  ({ initialViewState, children, onMapClick, style }, ref) => {
    return (
      <Map
        ref={ref}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
        initialViewState={initialViewState ?? DEFAULT_VIEW}
        style={{ width: '100%', height: '100%', ...style }}
        onClick={(e) => onMapClick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
      >
        <NavigationControl position="top-right" />
        {children}
      </Map>
    );
  }
);

SeaOfBlueMap.displayName = 'SeaOfBlueMap';
