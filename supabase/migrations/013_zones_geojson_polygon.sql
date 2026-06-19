-- Migration: Add geojson_polygon column to zones table
-- This enables dynamic zone boundary serving from the DB instead of a static file.
-- The polygon data is populated by running: node scripts/fetch-zone-polygons.js

ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS geojson_polygon JSONB;

COMMENT ON COLUMN zones.geojson_polygon IS
  'GeoJSON geometry object (Polygon or MultiPolygon) for this zone boundary. '
  'Fetched from OpenStreetMap via scripts/fetch-zone-polygons.js. '
  'When null, the map falls back to a lat/lng point if available.';
