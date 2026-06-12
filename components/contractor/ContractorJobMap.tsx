'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation, Route, Clock } from 'lucide-react';


interface ContractorJobMapProps {
  jobLat: number;
  jobLng: number;
  jobAddress: string;
}

interface RouteInfo {
  distanceKm: number;
  durationMin: number;
}

export default function ContractorJobMap({ jobLat, jobLng, jobAddress }: ContractorJobMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [locating, setLocating] = useState(true);
  const [routeError, setRouteError] = useState(false);
  const [mapToken, setMapToken] = useState('');
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');

  // Fetch token from server at runtime
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => { 
        if (cfg.mapboxToken) setMapToken(cfg.mapboxToken); 
        if (cfg.mapboxStyle) setMapStyle(cfg.mapboxStyle);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapToken) return;

    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [jobLng, jobLat],
      zoom: 12,
      interactive: true,
    });

    mapRef.current = map;

    // Job (destination) marker
    const destEl = document.createElement('div');
    destEl.style.cssText = `
      width: 36px; height: 36px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 12px rgba(59,130,246,0.5);
      font-size: 16px;
    `;
    destEl.innerText = '🏠';

    new mapboxgl.Marker({ element: destEl })
      .setLngLat([jobLng, jobLat])
      .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`<p style="font-size:12px;font-weight:700;">${jobAddress}</p>`))
      .addTo(map);

    // Get contractor's current location and draw route
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setLocating(false);
          const myLng = pos.coords.longitude;
          const myLat = pos.coords.latitude;

          // My location marker
          const myEl = document.createElement('div');
          myEl.style.cssText = `
            width: 28px; height: 28px;
            background: #22c55e;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 12px rgba(34,197,94,0.5);
            font-size: 14px;
            display: flex; align-items: center; justify-content: center;
          `;
          myEl.innerText = '📍';
          new mapboxgl.Marker({ element: myEl })
            .setLngLat([myLng, myLat])
            .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML('<p style="font-size:12px;font-weight:700;">Your Location</p>'))
            .addTo(map);

          // Fit bounds to show both pins
          const bounds = new mapboxgl.LngLatBounds()
            .extend([myLng, myLat])
            .extend([jobLng, jobLat]);
          map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });

          // Fetch route via our secure server-side proxy
          try {
            const res = await fetch(
              `/api/operations/directions?start_lng=${myLng}&start_lat=${myLat}&end_lng=${jobLng}&end_lat=${jobLat}`
            );
            const data = await res.json();
            const route = data.routes?.[0];
            if (!route) { setRouteError(true); return; }

            const distKm = (route.distance / 1000).toFixed(1);
            const durMin = Math.ceil(route.duration / 60);
            setRouteInfo({ distanceKm: parseFloat(distKm), durationMin: durMin });

            map.on('load', () => {
              if (map.getSource('route')) return;
              map.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: route.geometry,
                },
              });

              // Route outline (glow)
              map.addLayer({
                id: 'route-outline',
                type: 'line',
                source: 'route',
                paint: {
                  'line-color': '#3b82f6',
                  'line-width': 8,
                  'line-opacity': 0.25,
                  'line-blur': 4,
                },
              });

              // Route line
              map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': '#3b82f6',
                  'line-width': 5,
                  'line-opacity': 0.9,
                },
              });
            });

            // If map already loaded, add the source immediately
            if (map.loaded()) {
              if (!map.getSource('route')) {
                map.addSource('route', {
                  type: 'geojson',
                  data: { type: 'Feature', properties: {}, geometry: route.geometry },
                });
                map.addLayer({ id: 'route-outline', type: 'line', source: 'route', paint: { 'line-color': '#3b82f6', 'line-width': 8, 'line-opacity': 0.25, 'line-blur': 4 } });
                map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.9 } });
              }
            }
          } catch {
            setRouteError(true);
          }
        },
        () => {
          setLocating(false);
          // Location denied — just center on job
        }
      );
    } else {
      setLocating(false);
    }

    return () => { map.remove(); mapRef.current = null; };
  }, [jobLat, jobLng, jobAddress, mapToken, mapStyle]);

  return (
    <div className="space-y-2">
      {/* Route info strip */}
      {routeInfo && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
            <Route className="h-3.5 w-3.5" />
            {routeInfo.distanceKm} km
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <Clock className="h-3.5 w-3.5" />
            ~{routeInfo.durationMin} min
          </div>
          {locating && <p className="text-xs text-muted-foreground ml-auto">Locating...</p>}
          {routeError && <p className="text-xs text-muted-foreground ml-auto">Route unavailable</p>}
        </div>
      )}

      {/* Map canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-56 rounded-2xl overflow-hidden border border-border shadow-sm"
      />
    </div>
  );
}
