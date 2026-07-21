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

    const [jobsRes, employeeLocsRes, zonesRes, activeEmployeesRes, allTodayJobsRes] = await Promise.all([
      // Jobs with geo coords for map pins
      supabase
        .from('jobs')
        .select('id, job_number, status, service_type, scheduled_date, scheduled_window, address_line1, city, postal_code, quoted_price, final_price, add_ons, latitude, longitude, customer:customers(full_name, phone), employee:employees(id, full_name, phone, tier)')
        .eq('scheduled_date', targetDate)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null),

      // Live employee GPS pings
      supabase
        .from('employee_locations')
        .select('*, employee:employees(id, full_name, phone, tier, status, zone_id)')
        .eq('is_active', true),

      // All active zones with their zone_id for relational lookups
      supabase
        .from('zones')
        .select('id, name, city, is_active, areas, latitude, longitude')
        .eq('is_active', true),

      // All active employees (for HQ pins + zone assignment stats + in-house vs employee dominance)
      supabase
        .from('employees')
        .select('id, full_name, phone, tier, status, notes, zone_id')
        .eq('status', 'active'),

      // All today's jobs (including those without coords) for zone revenue/demand stats
      supabase
        .from('jobs')
        .select('id, status, quoted_price, final_price, city, latitude, longitude, employee_id, zone_id')
        .eq('scheduled_date', targetDate),
    ]);

    if (jobsRes.error) throw jobsRes.error;
    if (employeeLocsRes.error) throw employeeLocsRes.error;
    if (zonesRes.error) throw zonesRes.error;
    if (activeEmployeesRes.error) throw activeEmployeesRes.error;

    const employees = activeEmployeesRes.data ?? [];
    const allTodayJobs = allTodayJobsRes.data ?? [];
    const zones = zonesRes.data ?? [];

    // --- Employee HQ pins ---
    const employeeHQs = employees
      .map(employee => {
        let hq_coords = null;
        try {
          if (employee.notes) {
            const notesObj = JSON.parse(employee.notes);
            if (notesObj.hq_coords && typeof notesObj.hq_coords.lat === 'number' && typeof notesObj.hq_coords.lng === 'number') {
              hq_coords = notesObj.hq_coords;
            }
          }
        } catch {
          // ignore parse errors
        }
        return {
          id: employee.id,
          full_name: employee.full_name,
          phone: employee.phone,
          tier: employee.tier,
          status: employee.status,
          zone_id: employee.zone_id,
          latitude: hq_coords?.lat || null,
          longitude: hq_coords?.lng || null,
        };
      })
      .filter(hq => hq.latitude !== null && hq.longitude !== null);

    // --- Build zone metrics ---
    // We calculate demand/supply/revenue per zone using zone_id foreign key on jobs + employees.
    // If a job has a lat/lng, it will also appear on the map. Zone metrics use zone_id for precision.
    const onlineEmployeeIds = new Set(
      (employeeLocsRes.data ?? []).map(loc => (loc as any).employee?.id)
    );

    const zoneMetrics = zones.map(zone => {
      const zoneJobs = allTodayJobs.filter(j => j.zone_id === zone.id);
      const activeJobs = zoneJobs.filter(j => ACTIVE_STATUSES.includes(j.status));
      const completedJobs = zoneJobs.filter(j => j.status === 'completed');

      const totalRevenue = zoneJobs.reduce((sum, j) => sum + (j.final_price ?? j.quoted_price ?? 0), 0);
      const activeRevenue = activeJobs.reduce((sum, j) => sum + (j.quoted_price ?? 0), 0);

      const zoneEmployees = employees.filter(c => c.zone_id === zone.id);
      const onlineInZone = zoneEmployees.filter(c => onlineEmployeeIds.has(c.id)).length;
      const assignedInZone = activeJobs.filter(j => j.employee_id).length;

      // Coverage ratio: ratio of online employees to active demand (higher = better covered)
      const demand = activeJobs.length;
      let coverageStatus: 'high' | 'medium' | 'low' | 'idle' = 'idle';
      if (demand === 0 && onlineInZone === 0) {
        coverageStatus = 'idle';
      } else if (onlineInZone === 0 && demand > 0) {
        coverageStatus = 'low'; // No employees, has demand
      } else if (onlineInZone >= demand) {
        coverageStatus = 'high';
      } else if (onlineInZone < demand) {
        coverageStatus = demand - onlineInZone >= 2 ? 'low' : 'medium';
      }

      // ── In-house vs employee dominance ──────────────────────────────
      // "team" tier = Sea of Blue in-house staff
      // "basic" / "pro" tiers = independent employees
      const IN_HOUSE_TIERS = ['team'];
      const inHouseInZone = zoneEmployees.filter(c => IN_HOUSE_TIERS.includes(c.tier)).length;
      const independentInZone = zoneEmployees.length - inHouseInZone;

      // Jobs served by in-house vs employee this zone today
      const inHouseEmployeeIds = new Set(
        zoneEmployees.filter(c => IN_HOUSE_TIERS.includes(c.tier)).map(c => c.id)
      );
      const inHouseJobsToday = zoneJobs.filter(j => j.employee_id && inHouseEmployeeIds.has(j.employee_id)).length;
      const employeeJobsToday = zoneJobs.filter(j => j.employee_id && !inHouseEmployeeIds.has(j.employee_id)).length;

      // Dominance mode
      let dominanceMode: 'in_house' | 'employee' | 'mixed' | 'none' = 'none';
      if (inHouseInZone > 0 || independentInZone > 0) {
        const inHousePct = zoneEmployees.length > 0 ? inHouseInZone / zoneEmployees.length : 0;
        if (inHousePct >= 0.7) dominanceMode = 'in_house';
        else if (inHousePct <= 0.3) dominanceMode = 'employee';
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
        total_employees: zoneEmployees.length,
        online_employees: onlineInZone,
        assigned_jobs: assignedInZone,
        coverage_status: coverageStatus,
        // Dominance data
        in_house_employees: inHouseInZone,
        independent_employees: independentInZone,
        in_house_jobs_today: inHouseJobsToday,
        employee_jobs_today: employeeJobsToday,
        dominance_mode: dominanceMode,
      };
    });

    // --- Assignment routing lines ---
    // For each active/en-route job with a employee, build a [lng, lat] pair
    // connecting the employee's live location (or HQ) to the job site.
    const liveLocMap = new Map(
      (employeeLocsRes.data ?? []).map(loc => [loc.employee?.id, { lng: loc.longitude, lat: loc.latitude }])
    );
    const hqMap = new Map(
      employeeHQs.map(hq => [hq.id, { lng: hq.longitude, lat: hq.latitude }])
    );

    const assignmentLines = ((jobsRes.data ?? []) as any[])
      .filter((job: any) => ['assigned', 'on_the_way', 'in_progress'].includes(job.status) && job.employee?.id)
      .map((job: any) => {
        const cid = job.employee?.id;
        const from = liveLocMap.get(cid) || hqMap.get(cid);
        if (!from || !job.longitude || !job.latitude) return null;
        return {
          job_id: job.id,
          job_status: job.status,
          employee_id: cid,
          from: [from.lng, from.lat],
          to: [job.longitude, job.latitude],
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      jobs: jobsRes.data ?? [],
      employeeLocations: employeeLocsRes.data ?? [],
      zones: zonesRes.data ?? [],
      employeeHQs,
      zoneMetrics,
      assignmentLines,
    });
  } catch (err: unknown) {
    console.error('GET /api/operations/map-data error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
