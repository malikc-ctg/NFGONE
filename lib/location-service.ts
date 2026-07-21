/**
 * GPS location tracking service for the employee app.
 * Starts broadcasting GPS when employee taps "On my way",
 * stops when they mark the job complete.
 */

import { createClient } from '@/lib/supabase/client';

let watchId: number | null = null;
let activeJobId: string | null = null;

export function startLocationTracking(employeeId: string, jobId: string): void {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported on this device');
    return;
  }

  activeJobId = jobId;
  const supabase = createClient();

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;

      // Upsert live employee location
      await supabase
        .from('employee_locations')
        .upsert({
          employee_id: employeeId,
          latitude,
          longitude,
          accuracy,
          heading,
          speed: speed ? speed * 3.6 : null,   // convert m/s to km/h
          is_active: true,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'employee_id' });

      // Append to job location history (every update)
      if (activeJobId) {
        await supabase.from('job_location_history').insert({
          job_id: activeJobId,
          employee_id: employeeId,
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

export function stopLocationTracking(employeeId: string): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  activeJobId = null;

  // Mark employee as offline
  const supabase = createClient();
  supabase
    .from('employee_locations')
    .update({ is_active: false })
    .eq('employee_id', employeeId);
}
