import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api-auth';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Nominatim Geocoding Helper ─────────────────────────────────────────────
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

const ZONE_SEARCH_OVERRIDES: Record<string, string> = {
  'Downtown Toronto': 'Old Toronto, Toronto, Ontario, Canada',
  'Midtown Toronto': 'Midtown Toronto, Toronto, Ontario, Canada',
  'North York': 'North York, Toronto, Ontario, Canada',
  'Etobicoke': 'Etobicoke, Toronto, Ontario, Canada',
  'Scarborough': 'Scarborough, Toronto, Ontario, Canada',
  'Mississauga South': 'Mississauga, Ontario, Canada',
  'Mississauga North': 'Mississauga, Ontario, Canada',
  'Halton Region (Milton / Halton Hills)': 'Milton, Ontario, Canada',
  'Aurora / Newmarket': 'Aurora, Ontario, Canada',
  'Pickering / Ajax': 'Pickering, Ontario, Canada',
  'Whitby / Oshawa': 'Whitby, Ontario, Canada'
};

async function fetchZoneGeometry(name: string, city: string) {
  try {
    const searchStr = ZONE_SEARCH_OVERRIDES[name] || `${city || name}, Ontario, Canada`;
    const params = new URLSearchParams({
      q: searchStr,
      format: 'geojson',
      limit: '1',
      polygon_geojson: '1',
    });

    const res = await fetch(`${NOMINATIM_BASE}?${params.toString()}`, {
      headers: { 'User-Agent': 'SeaOfBlue-Admin/1.0 (admin@seaofblue.ca)' }
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features || data.features.length === 0) return null;

    const feature = data.features[0];
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) return null;

    return feature.geometry;
  } catch {
    return null; // Fail silently, zone will just be missing polygon
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();

    // Auto-fetch geometry for map
    const geometry = await fetchZoneGeometry(body.name, body.city);

    const { data, error } = await supabase
      .from('zones')
      .insert({ 
        name: body.name, 
        city: body.city, 
        areas: body.areas || [],
        notes: body.notes,
        geojson_polygon: geometry 
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();
    const { id, ...updates } = body;

    // If name or city changed, update the geometry
    if (updates.name || updates.city) {
      // Need current values if one is missing
      let searchName = updates.name;
      let searchCity = updates.city;
      
      if (!searchName || !searchCity) {
        const { data: existing } = await supabase.from('zones').select('name, city').eq('id', id).single();
        if (existing) {
          searchName = searchName || existing.name;
          searchCity = searchCity || existing.city;
        }
      }
      
      const geometry = await fetchZoneGeometry(searchName, searchCity);
      if (geometry) {
        updates.geojson_polygon = geometry;
      }
    }

    const { data, error } = await supabase
      .from('zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

