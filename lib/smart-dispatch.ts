/**
 * Sea of Blue — Smart Dispatch Engine
 * 
 * Ranks contractors by proximity (drive time via Mapbox), score, and availability.
 * Used by the admin dispatch UI to suggest the optimal contractor for each job.
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface DispatchSuggestion {
  contractor_id: string;
  full_name: string;
  phone: string | null;
  tier: string;
  score: number;
  zone_id: string | null;
  drive_minutes: number | null;
  jobs_today: number;
  dispatch_score: number;
  reason: string;
  origin: { lat: number; lng: number } | null;
}

/**
 * Get smart dispatch suggestions for a job.
 * Ranks contractors by: proximity (30%), score (40%), availability (30%)
 */
export async function getSmartDispatchSuggestions(
  job: any
): Promise<DispatchSuggestion[]> {
  const supabase = await createServiceClient();

  if (!job.zone_id) return [];

  // 1. Get all active contractors in this zone
  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, full_name, phone, tier, score, zone_id, notes, status')
    .eq('zone_id', job.zone_id)
    .eq('status', 'active');

  if (!contractors || contractors.length === 0) return [];

  // 2. Get live locations for these contractors
  const contractorIds = contractors.map(c => c.id);
  const { data: liveLocations } = await supabase
    .from('contractor_locations')
    .select('contractor_id, latitude, longitude')
    .in('contractor_id', contractorIds)
    .eq('is_active', true);

  const liveLocMap = new Map(
    (liveLocations ?? []).map(l => [l.contractor_id, { lat: l.latitude, lng: l.longitude }])
  );

  // 3. Get HQ locations from notes JSON
  const hqMap = new Map<string, { lat: number; lng: number }>();
  for (const c of contractors) {
    try {
      if (c.notes) {
        const n = JSON.parse(c.notes);
        if (n.hq_coords?.lat && n.hq_coords?.lng) {
          hqMap.set(c.id, { lat: n.hq_coords.lat, lng: n.hq_coords.lng });
        }
      }
    } catch { /* ignore */ }
  }

  // 4. Count today's assigned jobs per contractor
  const today = new Date().toISOString().split('T')[0];
  const { data: todaysJobs } = await supabase
    .from('jobs')
    .select('assigned_contractor_id')
    .eq('scheduled_date', today)
    .not('status', 'in', '(cancelled,refunded)')
    .not('assigned_contractor_id', 'is', null);

  const jobCountMap = new Map<string, number>();
  for (const j of todaysJobs ?? []) {
    const cid = j.assigned_contractor_id;
    jobCountMap.set(cid, (jobCountMap.get(cid) ?? 0) + 1);
  }

  // 5. Check for pending/active offers on this specific job
  const { data: existingOffers } = await supabase
    .from('job_offers')
    .select('contractor_id')
    .eq('job_id', job.id)
    .in('status', ['pending', 'accepted']);

  const alreadyOfferedIds = new Set((existingOffers ?? []).map(o => o.contractor_id));

  // 6. Calculate drive times via Mapbox (batch)
  const jobLat = job.latitude;
  const jobLng = job.longitude;
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const suggestions: DispatchSuggestion[] = [];

  for (const contractor of contractors) {
    // Skip contractors already offered this job
    if (alreadyOfferedIds.has(contractor.id)) continue;

    const origin = liveLocMap.get(contractor.id) ?? hqMap.get(contractor.id) ?? null;
    let driveMinutes: number | null = null;

    // Calculate drive time if we have both origin and destination
    if (origin && jobLat && jobLng && mapboxToken) {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${jobLng},${jobLat}?steps=false&geometries=geojson&overview=false&access_token=${mapboxToken}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes?.[0]?.duration) {
            driveMinutes = Math.round(data.routes[0].duration / 60);
          }
        }
      } catch {
        // Mapbox call failed — continue without drive time
      }
    }

    // Score calculation
    const scoreNorm = (contractor.score ?? 5) / 5;  // 0-1
    const jobsToday = jobCountMap.get(contractor.id) ?? 0;
    const maxJobs = 4; // Assume 4 max per day
    const availabilityFactor = Math.max(0, 1 - (jobsToday / maxJobs));

    // Proximity score: 30min = 0, 0min = 1, unknown = 0.5
    let proximityScore = 0.5; // default when unknown
    if (driveMinutes !== null) {
      proximityScore = Math.max(0, 1 - (driveMinutes / 30));
    }

    const dispatchScore = (scoreNorm * 0.4) + (availabilityFactor * 0.3) + (proximityScore * 0.3);

    // Build reason string
    const reasons: string[] = [];
    if (driveMinutes !== null) reasons.push(`${driveMinutes}min drive`);
    reasons.push(`${contractor.score?.toFixed(1) ?? '5.0'}★`);
    if (jobsToday > 0) reasons.push(`${jobsToday} jobs today`);
    if (liveLocMap.has(contractor.id)) reasons.push('📍 Live GPS');

    suggestions.push({
      contractor_id: contractor.id,
      full_name: contractor.full_name,
      phone: contractor.phone,
      tier: contractor.tier,
      score: contractor.score ?? 5,
      zone_id: contractor.zone_id,
      drive_minutes: driveMinutes,
      jobs_today: jobsToday,
      dispatch_score: Math.round(dispatchScore * 100) / 100,
      reason: reasons.join(' · '),
      origin,
    });
  }

  // Sort by dispatch score descending
  return suggestions.sort((a, b) => b.dispatch_score - a.dispatch_score);
}
