/**
 * scripts/fetch-zone-polygons.js
 *
 * Queries the Nominatim/Overpass APIs to fetch exact municipal boundary polygons
 * for all GTA service zones and writes them to public/zones.geojson.
 *
 * Run with: node scripts/fetch-zone-polygons.js
 */

const fs = require('fs');
const path = require('path');

// Zone definitions matching the database seeds in 005_multi_zone_system.sql
const ZONES = [
  { name: 'Downtown Toronto',               search: 'Old Toronto, Toronto, Ontario, Canada' },
  { name: 'Midtown Toronto',                search: 'Midtown Toronto, Toronto, Ontario, Canada' },
  { name: 'North York',                     search: 'North York, Toronto, Ontario, Canada' },
  { name: 'Etobicoke',                      search: 'Etobicoke, Toronto, Ontario, Canada' },
  { name: 'Scarborough',                    search: 'Scarborough, Toronto, Ontario, Canada' },
  { name: 'Mississauga South',              search: 'Mississauga, Ontario, Canada' },
  { name: 'Mississauga North',              search: 'Mississauga, Ontario, Canada' },
  { name: 'Brampton',                       search: 'Brampton, Ontario, Canada' },
  { name: 'Oakville',                       search: 'Oakville, Ontario, Canada' },
  { name: 'Burlington',                     search: 'Burlington, Ontario, Canada' },
  { name: 'Halton Region (Milton / Halton Hills)', search: 'Milton, Ontario, Canada' },
  { name: 'Vaughan',                        search: 'Vaughan, Ontario, Canada' },
  { name: 'Richmond Hill',                  search: 'Richmond Hill, Ontario, Canada' },
  { name: 'Markham',                        search: 'Markham, Ontario, Canada' },
  { name: 'Aurora / Newmarket',             search: 'Aurora, Ontario, Canada' },
  { name: 'Pickering / Ajax',               search: 'Pickering, Ontario, Canada' },
  { name: 'Whitby / Oshawa',               search: 'Whitby, Ontario, Canada' },
];

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const DELAY_MS = 1200; // Be polite to Nominatim's 1 req/s limit

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPolygon(zone) {
  const params = new URLSearchParams({
    q: zone.search,
    format: 'geojson',
    limit: '1',
    polygon_geojson: '1',
  });

  const url = `${NOMINATIM_BASE}?${params.toString()}`;
  console.log(`  Fetching: ${zone.name} → "${zone.search}"`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SeaOfBlue-DispatchMap/1.0 (admin@seaofblue.ca)' }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      console.warn(`  ⚠  No results for: ${zone.name}`);
      return null;
    }

    const feature = data.features[0];
    // Only keep Polygon or MultiPolygon types; skip Points if OSM returns them
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) {
      console.warn(`  ⚠  Got ${feature.geometry?.type} (not a polygon) for: ${zone.name}`);
      return null;
    }

    return {
      type: 'Feature',
      properties: {
        name: zone.name,
        osm_display: feature.properties?.display_name ?? zone.search,
      },
      geometry: feature.geometry,
    };
  } catch (err) {
    console.error(`  ✗ Failed for ${zone.name}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🗺  Fetching GTA zone polygons from OpenStreetMap...\n');

  const features = [];

  for (const zone of ZONES) {
    const feature = await fetchPolygon(zone);
    if (feature) {
      features.push(feature);
      console.log(`  ✓ ${zone.name} (${feature.geometry.type})`);
    }
    await sleep(DELAY_MS);
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  const outPath = path.join(__dirname, '..', 'public', 'zones.geojson');
  fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2));

  console.log(`\n✅ Wrote ${features.length}/${ZONES.length} zones to ${outPath}`);
  if (features.length < ZONES.length) {
    console.warn(`⚠  ${ZONES.length - features.length} zone(s) could not be resolved — check warnings above.`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
