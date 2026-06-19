import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

/**
 * GET /api/operations/zones-geojson
 *
 * Dynamically builds a GeoJSON FeatureCollection from the zones table.
 * Each zone that has cached polygon data (stored in the zones.geojson_polygon column)
 * is returned as a GeoJSON Feature.
 *
 * For zones without cached polygons, we fall back to a point feature using
 * zones.latitude/longitude (if set), or skip the zone entirely.
 *
 * This ensures the map is always in sync with the DB — adding/deleting zones
 * in the admin panel immediately reflects on the map.
 *
 * The polygon cache is populated by running: node scripts/fetch-zone-polygons.js
 * which now writes polygon data back to the DB instead of a static file.
 */
export async function GET() {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();

    const { data: zones, error } = await supabase
      .from('zones')
      .select('id, name, city, is_active, areas, latitude, longitude, geojson_polygon')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Build features array — prefer polygon, fall back to point
    const features: any[] = [];

    for (const zone of zones ?? []) {
      if (zone.geojson_polygon) {
        // Stored polygon from OSM fetch
        features.push({
          type: 'Feature',
          properties: {
            zone_id: zone.id,
            name: zone.name,
            city: zone.city,
          },
          geometry: zone.geojson_polygon,
        });
      } else if (zone.latitude && zone.longitude) {
        // Fall back to a point — map will show a label but no fill
        features.push({
          type: 'Feature',
          properties: {
            zone_id: zone.id,
            name: zone.name,
            city: zone.city,
            is_point_fallback: true,
          },
          geometry: {
            type: 'Point',
            coordinates: [zone.longitude, zone.latitude],
          },
        });
      }
      // If no geometry at all — skip (zone will still appear in sidebar)
    }

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    return new NextResponse(JSON.stringify(geojson), {
      status: 200,
      headers: {
        'Content-Type': 'application/geo+json',
        'Cache-Control': 'no-store', // Always fresh — synced with DB
      },
    });
  } catch (err: unknown) {
    console.error('GET /api/operations/zones-geojson error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
