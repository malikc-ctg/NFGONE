import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { format } from 'date-fns';

const ACTIVE_STATUSES = ['confirmed', 'offered', 'assigned', 'on_the_way', 'in_progress'];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    
    // Parse date from query string, default to today
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    const [jobsRes, contractorLocsRes, zonesRes, activeContractorsRes, allTodayJobsRes] = await Promise.all([
      // Jobs with geo coords for map pins
      supabase
        .from('jobs')
        .select('id, job_number, status, service_type, scheduled_date, scheduled_window, address_line1, city, postal_code, quoted_price, final_price, add_ons, latitude, longitude, customer:customers(full_name, phone), contractor:contractors(id, full_name, phone, tier)')
        .eq('scheduled_date', targetDate)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null),

      // Live contractor GPS pings
      supabase
        .from('contractor_locations')
        .select('*, contractor:contractors(id, full_name, phone, tier, status, zone_id)')
        .eq('is_active', true),

      // All active zones with their zone_id for relational lookups
      supabase
        .from('zones')
        .select('id, name, city, is_active, areas, latitude, longitude')
        .eq('is_active', true),

      // All active contractors (for HQ pins + zone assignment stats + in-house vs contractor dominance)
      supabase
        .from('contractors')
        .select('id, full_name, phone, tier, status, notes, zone_id')
        .eq('status', 'active'),

      // All today's jobs (including those without coords) for zone revenue/demand stats
      supabase
        .from('jobs')
        .select('id, status, quoted_price, final_price, city, latitude, longitude, contractor_id, zone_id')
        .eq('scheduled_date', targetDate),
    ]);

    if (jobsRes.error) throw jobsRes.error;
    if (contractorLocsRes.error) throw contractorLocsRes.error;
    if (zonesRes.error) throw zonesRes.error;
    if (activeContractorsRes.error) throw activeContractorsRes.error;

    const contractors = activeContractorsRes.data ?? [];
    const allTodayJobs = allTodayJobsRes.data ?? [];
    const zones = zonesRes.data ?? [];

    // --- Contractor HQ pins ---
    const contractorHQs = contractors
      .map(contractor => {
        let hq_coords = null;
        try {
          if (contractor.notes) {
            const notesObj = JSON.parse(contractor.notes);
            if (notesObj.hq_coords && typeof notesObj.hq_coords.lat === 'number' && typeof notesObj.hq_coords.lng === 'number') {
              hq_coords = notesObj.hq_coords;
            }
          }
        } catch {
          // ignore parse errors
        }
        return {
          id: contractor.id,
          full_name: contractor.full_name,
          phone: contractor.phone,
          tier: contractor.tier,
          status: contractor.status,
          zone_id: contractor.zone_id,
          latitude: hq_coords?.lat || null,
          longitude: hq_coords?.lng || null,
        };
      })
      .filter(hq => hq.latitude !== null && hq.longitude !== null);

    // --- Build zone metrics ---
    // We calculate demand/supply/revenue per zone using zone_id foreign key on jobs + contractors.
    // If a job has a lat/lng, it will also appear on the map. Zone metrics use zone_id for precision.
    const onlineContractorIds = new Set(
      (contractorLocsRes.data ?? []).map(loc => (loc as any).contractor?.id)
    );

    const zoneMetrics = zones.map(zone => {
      const zoneJobs = allTodayJobs.filter(j => j.zone_id === zone.id);
      const activeJobs = zoneJobs.filter(j => ACTIVE_STATUSES.includes(j.status));
      const completedJobs = zoneJobs.filter(j => j.status === 'completed');

      const totalRevenue = zoneJobs.reduce((sum, j) => sum + (j.final_price ?? j.quoted_price ?? 0), 0);
      const activeRevenue = activeJobs.reduce((sum, j) => sum + (j.quoted_price ?? 0), 0);

      const zoneContractors = contractors.filter(c => c.zone_id === zone.id);
      const onlineInZone = zoneContractors.filter(c => onlineContractorIds.has(c.id)).length;
      const assignedInZone = activeJobs.filter(j => j.contractor_id).length;

      // Coverage ratio: ratio of online contractors to active demand (higher = better covered)
      const demand = activeJobs.length;
      let coverageStatus: 'high' | 'medium' | 'low' | 'idle' = 'idle';
      if (demand === 0 && onlineInZone === 0) {
        coverageStatus = 'idle';
      } else if (onlineInZone === 0 && demand > 0) {
        coverageStatus = 'low'; // No contractors, has demand
      } else if (onlineInZone >= demand) {
        coverageStatus = 'high';
      } else if (onlineInZone < demand) {
        coverageStatus = demand - onlineInZone >= 2 ? 'low' : 'medium';
      }

      // ── In-house vs contractor dominance ──────────────────────────────
      // "team" tier = Sea of Blue in-house staff
      // "basic" / "pro" tiers = independent contractors
      const IN_HOUSE_TIERS = ['team'];
      const inHouseInZone = zoneContractors.filter(c => IN_HOUSE_TIERS.includes(c.tier)).length;
      const independentInZone = zoneContractors.length - inHouseInZone;

      // Jobs served by in-house vs contractor this zone today
      const inHouseContractorIds = new Set(
        zoneContractors.filter(c => IN_HOUSE_TIERS.includes(c.tier)).map(c => c.id)
      );
      const inHouseJobsToday = zoneJobs.filter(j => j.contractor_id && inHouseContractorIds.has(j.contractor_id)).length;
      const contractorJobsToday = zoneJobs.filter(j => j.contractor_id && !inHouseContractorIds.has(j.contractor_id)).length;

      // Dominance mode
      let dominanceMode: 'in_house' | 'contractor' | 'mixed' | 'none' = 'none';
      if (inHouseInZone > 0 || independentInZone > 0) {
        const inHousePct = zoneContractors.length > 0 ? inHouseInZone / zoneContractors.length : 0;
        if (inHousePct >= 0.7) dominanceMode = 'in_house';
        else if (inHousePct <= 0.3) dominanceMode = 'contractor';
        else dominanceMode = 'mixed';
      }

      return {
        zone_id: zone.id,
        name: zone.name,
        city: zone.city,
        total_jobs_today: zoneJobs.length,
        active_jobs: demand,
        completed_jobs: completedJobs.length,
        total_revenue: totalRevenue,
        active_revenue: activeRevenue,
        total_contractors: zoneContractors.length,
        online_contractors: onlineInZone,
        assigned_jobs: assignedInZone,
        coverage_status: coverageStatus,
        // Dominance data
        in_house_contractors: inHouseInZone,
        independent_contractors: independentInZone,
        in_house_jobs_today: inHouseJobsToday,
        contractor_jobs_today: contractorJobsToday,
        dominance_mode: dominanceMode,
      };
    });

    // --- Assignment routing lines ---
    // For each active/en-route job with a contractor, build a [lng, lat] pair
    // connecting the contractor's live location (or HQ) to the job site.
    const liveLocMap = new Map(
      (contractorLocsRes.data ?? []).map(loc => [loc.contractor?.id, { lng: loc.longitude, lat: loc.latitude }])
    );
    const hqMap = new Map(
      contractorHQs.map(hq => [hq.id, { lng: hq.longitude, lat: hq.latitude }])
    );

    const assignmentLines = ((jobsRes.data ?? []) as any[])
      .filter((job: any) => ['assigned', 'on_the_way', 'in_progress'].includes(job.status) && job.contractor?.id)
      .map((job: any) => {
        const cid = job.contractor?.id;
        const from = liveLocMap.get(cid) || hqMap.get(cid);
        if (!from || !job.longitude || !job.latitude) return null;
        return {
          job_id: job.id,
          job_status: job.status,
          contractor_id: cid,
          from: [from.lng, from.lat],
          to: [job.longitude, job.latitude],
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      jobs: jobsRes.data ?? [],
      contractorLocations: contractorLocsRes.data ?? [],
      zones: zonesRes.data ?? [],
      contractorHQs,
      zoneMetrics,
      assignmentLines,
    });
  } catch (err: unknown) {
    console.error('GET /api/operations/map-data error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
