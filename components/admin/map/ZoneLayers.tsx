'use client';

import { Source, Layer } from 'react-map-gl/mapbox';

interface ZoneData {
  id: string;
  name: string;
  geojson: GeoJSON.Feature;
  color: string;
}

interface ZoneLayersProps {
  zones: ZoneData[];
}

// Default zone colors if none specified
const ZONE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#06B6D4', '#EF4444', '#6366F1',
];

export function ZoneLayers({ zones }: ZoneLayersProps) {
  return (
    <>
      {zones.map((zone, i) => {
        const color = zone.color || ZONE_COLORS[i % ZONE_COLORS.length];
        return (
          <Source key={zone.id} type="geojson" data={zone.geojson}>
            <Layer
              id={`zone-fill-${zone.id}`}
              type="fill"
              paint={{
                'fill-color': color,
                'fill-opacity': 0.08,
              }}
            />
            <Layer
              id={`zone-border-${zone.id}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': 1.5,
                'line-opacity': 0.4,
                'line-dasharray': [3, 2],
              }}
            />
          </Source>
        );
      })}
    </>
  );
}
