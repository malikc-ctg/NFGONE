/**
 * lib/geocode.ts
 *
 * Robust geocoding service for Sea of Blue.
 * Primary engine: OpenStreetMap Nominatim with smart address parsing & fallbacks.
 * Secondary engine: Mapbox Geocoding API.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  streetNumber?: string;
  streetName?: string;
  city?: string;
  municipality?: string;
  suburb?: string;
  neighborhood?: string;
  postalCode?: string;
  county?: string;
  province?: string;
}

// In-memory cache to avoid repeated network calls for identical queries
const geocodeCache = new Map<string, GeocodeResult | null>();

/**
 * Geocodes an address string to precise coordinates and structured components.
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  postalCode?: string
): Promise<GeocodeResult | null> {
  const cleanAddress = (address || '').trim();
  const cleanCity = (city || '').trim();
  const cleanPostal = (postalCode || '').trim();

  if (!cleanAddress && !cleanCity && !cleanPostal) return null;

  const cacheKey = `${cleanAddress}|${cleanCity}|${cleanPostal}`.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) || null;
  }

  // 1. Try OpenStreetMap Nominatim (structured / natural search)
  const result = await geocodeWithNominatim(cleanAddress, cleanCity, cleanPostal);
  if (result) {
    geocodeCache.set(cacheKey, result);
    return result;
  }

  // 2. Try Mapbox as fallback if token is available
  const mapboxResult = await geocodeWithMapbox(cleanAddress, cleanCity, cleanPostal);
  if (mapboxResult) {
    geocodeCache.set(cacheKey, mapboxResult);
    return mapboxResult;
  }

  geocodeCache.set(cacheKey, null);
  return null;
}

async function geocodeWithNominatim(
  address: string,
  city?: string,
  postalCode?: string
): Promise<GeocodeResult | null> {
  // Build query candidates in order of precision:
  // 1. full query: "address, city, Ontario, Canada, postalCode"
  // 2. address + city: "address, city, Ontario, Canada"
  // 3. street name only (if house number failed): "street, city, Ontario, Canada"
  // 4. city + postal: "city, Ontario, Canada, postalCode"

  const queries: string[] = [];

  const parts = [address, city, 'Ontario', 'Canada', postalCode].filter(Boolean);
  queries.push(parts.join(', '));

  if (address && city) {
    queries.push(`${address}, ${city}, Ontario, Canada`);
  }

  // Try extracting street without unit or house number if complex
  const streetOnly = address.replace(/^[0-9A-Za-z#\-\s]+\s+(Avenue|Street|Road|Drive|Crescent|Boulevard|Court|Way|Circle|Lane|Blvd|St|Rd|Ave|Dr|Cres|Ct)/i, '$1');
  if (streetOnly && streetOnly !== address && city) {
    queries.push(`${streetOnly}, ${city}, Ontario, Canada`);
  }

  if (city) {
    queries.push(`${city}, Ontario, Canada`);
  }

  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SeaOfBlue-Operations/1.0 (operations@seaofblue.ca)',
          'Accept-Language': 'en-CA,en;q=0.9',
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const item = data[0];
      const addr = item.address || {};

      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      if (isNaN(lat) || isNaN(lon)) continue;

      const extractedCity =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.village ||
        addr.city_district ||
        city ||
        'Toronto';

      const extractedPostal = addr.postcode || postalCode || '';
      const extractedSuburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
      const extractedCounty = addr.county || '';

      return {
        latitude: lat,
        longitude: lon,
        formattedAddress: item.display_name,
        streetNumber: addr.house_number || '',
        streetName: addr.road || '',
        city: extractedCity,
        municipality: extractedCity,
        suburb: extractedSuburb,
        neighborhood: extractedSuburb,
        postalCode: extractedPostal,
        county: extractedCounty,
        province: addr.state || 'Ontario',
      };
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

async function geocodeWithMapbox(
  address: string,
  city?: string,
  postalCode?: string
): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || token.startsWith('your_')) return null;

  try {
    const query = encodeURIComponent([address, city, 'Ontario', 'Canada', postalCode].filter(Boolean).join(', '));
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&country=CA&limit=1`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lon, lat] = feature.center;
    const context = feature.context || [];

    let extractedCity = city;
    let extractedPostal = postalCode;

    for (const ctx of context) {
      if (ctx.id.startsWith('place')) extractedCity = ctx.text;
      if (ctx.id.startsWith('postcode')) extractedPostal = ctx.text;
    }

    return {
      latitude: lat,
      longitude: lon,
      formattedAddress: feature.place_name,
      city: extractedCity,
      postalCode: extractedPostal,
    };
  } catch {
    return null;
  }
}
