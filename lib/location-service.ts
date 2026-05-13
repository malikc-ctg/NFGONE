/**
 * GPS location tracking service for the contractor app.
 * Starts broadcasting GPS when contractor taps "On my way",
 * stops when they mark the job complete.
 */

import { createClient } from '@/lib/supabase/client';

let watchId: number | null = null;
let activeJobId: string | null = null;

export function startLocationTracking(contractorId: string, jobId: string): void {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported on this device');
    return;
  }

  activeJobId = jobId;
  const supabase = createClient();

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;

      // Upsert live contractor location
      await supabase
        .from('contractor_locations')
        .upsert({
          contractor_id: contractorId,
          latitude,
          longitude,
          accuracy,
          heading,
          speed: speed ? speed * 3.6 : null,   // convert m/s to km/h
          is_active: true,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'contractor_id' });

      // Append to job location history (every update)
      if (activeJobId) {
        await supabase.from('job_location_history').insert({
          job_id: activeJobId,
          contractor_id: contractorId,
          latitude,
          longitude,
        });
      }
    },
    (error) => console.error('Location error:', error),
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    }
  );
}

export function stopLocationTracking(contractorId: string): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  activeJobId = null;

  // Mark contractor as offline
  const supabase = createClient();
  supabase
    .from('contractor_locations')
    .update({ is_active: false })
    .eq('contractor_id', contractorId);
}
