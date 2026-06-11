import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Proxy for Mapbox Directions API.
 * Keeps the token server-side.
 * GET /api/operations/directions?start_lng=...&start_lat=...&end_lng=...&end_lat=...
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const startLng = searchParams.get('start_lng');
  const startLat = searchParams.get('start_lat');
  const endLng = searchParams.get('end_lng');
  const endLat = searchParams.get('end_lat');

  if (!startLng || !startLat || !endLng || !endLat) {
    return NextResponse.json({ error: 'start_lng, start_lat, end_lng, end_lat are required' }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 });
  }

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?steps=false&geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Mapbox directions API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
