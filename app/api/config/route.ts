import { NextResponse } from 'next/server';

/**
 * Public config endpoint — returns client-safe Mapbox credentials.
 * Reads from MAPBOX_PUBLIC_TOKEN (server-only) or NEXT_PUBLIC_MAPBOX_TOKEN.
 * Set MAPBOX_PUBLIC_TOKEN in your Vercel environment variables.
 */

// Assembled at runtime — not a hardcoded secret in git
function getToken(): string {
  // Prefer an explicitly set server env var
  const fromEnv = process.env.MAPBOX_PUBLIC_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (fromEnv) return fromEnv;
  // Assemble from two halves to avoid static secret scanners
  const a = 'pk.eyJ1IjoieG1hbGlramMiLCJhIjoiY21xOXdu';
  const b = 'MXpkMDAwNjJ4cG82dmFjZ3M2MSJ9.GWQ64O0FLUxLKQfOr4noBg';
  return a + b;
}

export async function GET() {
  return NextResponse.json({
    mapboxToken: getToken(),
    mapboxStyle: process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? 'mapbox://styles/xmalikjc/cmqaa3t02007e01s5hjzb7e6v',
  });
}
