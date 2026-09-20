/**
 * lib/zone-matcher.ts
 *
 * Intelligent spatial & municipal zone detection and dynamic coverage expansion.
 * Automatically resolves coordinates to the correct regional zone, or creates and
 * outlines a new zone if the address falls in an expansion market.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { geocodeAddress, GeocodeResult } from '@/lib/geocode';

export interface ZoneRecord {
  id: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  areas: string[] | null;
  geojson_polygon: any | null;
  is_active: boolean;
}

export interface ZoneMatchResult {
  zoneId: string;
  zoneName: string;
  city: string;
  latitude: number;
  longitude: number;
  cleanAddress: string;
  cleanCity: string;
  cleanPostalCode: string;
  wasCreated: boolean;
}

/**
 * Standard ray-casting algorithm to determine if a point [lng, lat] is inside a polygon ring.
 */
export function pointInPolygon(point: [number, number], vs: number[][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Handles GeoJSON Polygon or MultiPolygon point-in-polygon checks.
 */
export function isPointInGeometry(point: [number, number], geometry: any): boolean {
  if (!geometry || !geometry.type || !geometry.coordinates) return false;

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates;
    if (!rings || rings.length === 0) return false;

    // Must be inside outer ring
    if (!pointInPolygon(point, rings[0])) return false;

    // Must not be inside any inner hole
    for (let h = 1; h < rings.length; h++) {
      if (pointInPolygon(point, rings[h])) return false;
    }
    return true;
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates;
    for (const poly of polygons) {
      if (!poly || poly.length === 0) continue;
      if (pointInPolygon(point, poly[0])) {
        let inHole = false;
        for (let h = 1; h < poly.length; h++) {
          if (pointInPolygon(point, poly[h])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }

  return false;
}

/**
 * Haversine distance formula in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetches boundary polygon from OpenStreetMap Nominatim for a municipality.
 */
export async function fetchZoneBoundaryPolygon(
  searchQuery: string
): Promise<{ geometry: any; centerLat: number; centerLon: number } | null> {
  const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
  const params = new URLSearchParams({
    q: `${searchQuery}, Ontario, Canada`,
    format: 'geojson',
    limit: '1',
    polygon_geojson: '1',
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}?${params.toString()}`, {
      headers: { 'User-Agent': 'SeaOfBlue-Operations/1.0 (operations@seaofblue.ca)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features || data.features.length === 0) return null;

    const f = data.features[0];
    const geom = f.geometry;
    if (!geom || !['Polygon', 'MultiPolygon'].includes(geom.type)) return null;

    let centerLat = 43.6532;
    let centerLon = -79.3832;

    if (f.bbox && f.bbox.length === 4) {
      centerLon = (f.bbox[0] + f.bbox[2]) / 2;
      centerLat = (f.bbox[1] + f.bbox[3]) / 2;
    }

    return { geometry: geom, centerLat, centerLon };
  } catch (err) {
    console.error('Failed to fetch zone polygon:', err);
    return null;
  }
}

/**
 * Resolves an address to its matching zone. If no zone covers the address,
 * it dynamically creates a new zone with official boundaries and returns it.
 */
export async function resolveOrCreateZone(params: {
  address_line1: string;
  city?: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<ZoneMatchResult> {
  const supabase = await createServiceClient();

  // 1. Geocode if coordinates are missing
  let lat = params.latitude;
  let lon = params.longitude;
  let geo: GeocodeResult | null = null;

  if (!lat || !lon) {
    geo = await geocodeAddress(params.address_line1, params.city, params.postal_code);
    if (geo) {
      lat = geo.latitude;
      lon = geo.longitude;
    }
  }

  // Fallback defaults if geocoding completely failed
  const finalLat = lat || 43.6532;
  const finalLon = lon || -79.3832;
  const cleanCity = geo?.city || params.city || 'Toronto';
  const cleanPostal = geo?.postalCode || params.postal_code || '';
  const cleanAddress = params.address_line1.trim();

  // 2. Fetch all active zones with polygons
  const { data: zones } = await supabase
    .from('zones')
    .select('*')
    .eq('is_active', true);

  const activeZones: ZoneRecord[] = zones || [];

  // 3. Step A: Point-in-polygon spatial detection
  if (lat && lon) {
    const pt: [number, number] = [lon, lat];
    for (const z of activeZones) {
      if (z.geojson_polygon && isPointInGeometry(pt, z.geojson_polygon)) {
        return {
          zoneId: z.id,
          zoneName: z.name,
          city: z.city,
          latitude: finalLat,
          longitude: finalLon,
          cleanAddress,
          cleanCity,
          cleanPostalCode: cleanPostal,
          wasCreated: false,
        };
      }
    }
  }

  // 4. Step B: Municipal & Suburb name matching
  const targetCityNorm = cleanCity.toLowerCase().trim();
  const targetSuburbNorm = (geo?.suburb || '').toLowerCase().trim();

  for (const z of activeZones) {
    const zoneCityNorm = (z.city || '').toLowerCase().trim();
    const zoneNameNorm = (z.name || '').toLowerCase().trim();
    const areasNorm = (z.areas || []).map((a) => a.toLowerCase().trim());

    if (
      zoneCityNorm === targetCityNorm ||
      zoneNameNorm.includes(targetCityNorm) ||
      areasNorm.includes(targetCityNorm) ||
      (targetSuburbNorm && areasNorm.includes(targetSuburbNorm))
    ) {
      return {
        zoneId: z.id,
        zoneName: z.name,
        city: z.city,
        latitude: finalLat,
        longitude: finalLon,
        cleanAddress,
        cleanCity,
        cleanPostalCode: cleanPostal,
        wasCreated: false,
      };
    }
  }

  // 5. Step C: Nearest zone by proximity (within 12 km)
  let closestZone: ZoneRecord | null = null;
  let minDistance = 12; // km cutoff

  for (const z of activeZones) {
    if (z.latitude && z.longitude) {
      const dist = haversineDistance(finalLat, finalLon, z.latitude, z.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closestZone = z;
      }
    }
  }

  if (closestZone) {
    return {
      zoneId: closestZone.id,
      zoneName: closestZone.name,
      city: closestZone.city,
      latitude: finalLat,
      longitude: finalLon,
      cleanAddress,
      cleanCity,
      cleanPostalCode: cleanPostal,
      wasCreated: false,
    };
  }

  // 6. Step D: Dynamic Zone Creation (Coverage Expander)
  // If the location is outside all existing zones, create a new zone covering this market
  const newZoneName = `${cleanCity} Region`;
  const polyResult = await fetchZoneBoundaryPolygon(cleanCity);

  const newZoneRecord = {
    name: newZoneName,
    city: cleanCity,
    latitude: polyResult?.centerLat || finalLat,
    longitude: polyResult?.centerLon || finalLon,
    areas: geo?.suburb ? [geo.suburb] : [cleanCity],
    geojson_polygon: polyResult?.geometry || null,
    is_active: true,
  };

  const { data: createdZone, error: createError } = await supabase
    .from('zones')
    .insert(newZoneRecord)
    .select()
    .single();

  if (createError || !createdZone) {
    console.error('Failed to create new zone:', createError);
    // Fallback to first active zone
    const fallback = activeZones[0];
    return {
      zoneId: fallback?.id || '',
      zoneName: fallback?.name || 'Default Zone',
      city: fallback?.city || 'Toronto',
      latitude: finalLat,
      longitude: finalLon,
      cleanAddress,
      cleanCity,
      cleanPostalCode: cleanPostal,
      wasCreated: false,
    };
  }

  return {
    zoneId: createdZone.id,
    zoneName: createdZone.name,
    city: createdZone.city,
    latitude: finalLat,
    longitude: finalLon,
    cleanAddress,
    cleanCity,
    cleanPostalCode: cleanPostal,
    wasCreated: true,
  };
}
