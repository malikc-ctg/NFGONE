/**
 * Geocode an address string to latitude/longitude using Mapbox Geocoding API.
 * Called server-side on job creation — runs once per job, not on every page load.
 */
export async function geocodeAddress(
  address: string,
  city: string,
  postalCode: string
): Promise<{ latitude: number; longitude: number } | null> {
  const query = encodeURIComponent(`${address}, ${city}, Ontario, Canada, ${postalCode}`);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || token === 'your_mapbox_public_token') {
    console.warn('Mapbox token not configured — skipping geocoding');
    return null;
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&country=CA&limit=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const feature = data.features?.[0];
    if (!feature) return null;

    const [longitude, latitude] = feature.center;
    return { latitude, longitude };
  } catch (err) {
    console.error('Geocoding failed:', err);
    return null;
  }
}
