/**
 * scripts/fetch-zone-polygons.js
 *
 * Queries the Nominatim/Overpass APIs to fetch exact municipal boundary polygons
 * for all GTA service zones and writes them to the Supabase database.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
 * in your .env.local file.
 *
 * Run with: node scripts/fetch-zone-polygons.js
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const DELAY_MS = 1200; // Be polite to Nominatim's 1 req/s limit

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ZONE_SEARCH_OVERRIDES = {
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

async function fetchPolygon(zoneName, cityName) {
  const searchStr = ZONE_SEARCH_OVERRIDES[zoneName] || `${cityName || zoneName}, Ontario, Canada`;
  const params = new URLSearchParams({ q: searchStr, format: 'geojson', limit: '1', polygon_geojson: '1' });
  const url = `${NOMINATIM_BASE}?${params.toString()}`;
  console.log(`  Fetching: ${zoneName} → "${searchStr}"`);

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SeaOfBlue-DispatchMap/1.0 (admin@seaofblue.ca)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.features || data.features.length === 0) {
      console.warn(`  ⚠  No results for: ${zoneName}`);
      return null;
    }
    const feature = data.features[0];
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) {
      console.warn(`  ⚠  Got ${feature.geometry?.type} (not a polygon) for: ${zoneName}`);
      return null;
    }
    return feature.geometry;
  } catch (err) {
    console.error(`  ✗ Failed for ${zoneName}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🗺  Fetching live zones from database...\n');
  
  const res = await fetch(`${supabaseUrl}/rest/v1/zones?select=id,name,city&is_active=eq.true`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  
  if (!res.ok) {
    console.error('❌ Failed to fetch zones from DB:', await res.text());
    process.exit(1);
  }
  
  const zones = await res.json();
  console.log(`Found ${zones.length} active zones. Fetching boundary polygons from OpenStreetMap...\n`);

  let updatedCount = 0;

  for (const zone of zones) {
    const geometry = await fetchPolygon(zone.name, zone.city);
    if (geometry) {
      const updateRes = await fetch(`${supabaseUrl}/rest/v1/zones?id=eq.${zone.id}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ geojson_polygon: geometry })
      });
      if (!updateRes.ok) {
        console.error(`  ✗ Failed to save ${zone.name} to DB:`, await updateRes.text());
      } else {
        console.log(`  ✓ ${zone.name} saved to DB (${geometry.type})`);
        updatedCount++;
      }
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ Updated polygons for ${updatedCount}/${zones.length} zones in the database.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
