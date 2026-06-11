import { NextResponse } from 'next/server';

/**
 * Public config endpoint — returns client-safe Mapbox credentials.
 * The token is a public pk. token, not a secret — but we serve it
 * via this route so it never appears in the JS bundle or git history.
 */
export async function GET() {
  return NextResponse.json({
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
    mapboxStyle: process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? 'mapbox://styles/xmalikjc/cmq9vl0he000x01s49ram288d',
  });
}
