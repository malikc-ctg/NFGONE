/**
 * Fetch ETA and route geometry from Mapbox Directions API.
 * Used by customer tracking page to show route line and arrival time.
 */
export async function fetchETA(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): Promise<{ minutes: number; route: GeoJSON.LineString }> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${token}`;

  const res = await fetch(url);
  const data = await res.json();

  const route = data.routes?.[0];
  if (!route) throw new Error('No route found');

  return {
    minutes: Math.ceil(route.duration / 60),
    route: route.geometry,
  };
}
