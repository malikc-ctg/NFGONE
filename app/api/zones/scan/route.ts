import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { resolveOrCreateZone } from '@/lib/zone-matcher';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();

    // 1. Fetch all jobs
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select('id, job_number, address_line1, city, postal_code, latitude, longitude, zone_id');

    if (jobsErr) throw jobsErr;

    let updatedJobsCount = 0;
    let newlyCreatedZonesCount = 0;

    for (const job of jobs || []) {
      const rawAddr = (job.address_line1 || '').trim();
      if (!rawAddr || rawAddr === 'TBD') continue;

      const result = await resolveOrCreateZone({
        address_line1: rawAddr,
        city: job.city,
        postal_code: job.postal_code,
        latitude: job.latitude,
        longitude: job.longitude,
      });

      if (result.wasCreated) {
        newlyCreatedZonesCount++;
      }

      // Update job if coordinates, zone, or clean city changed
      if (
        job.latitude !== result.latitude ||
        job.longitude !== result.longitude ||
        job.zone_id !== result.zoneId ||
        job.city !== result.cleanCity
      ) {
        await supabase
          .from('jobs')
          .update({
            latitude: result.latitude,
            longitude: result.longitude,
            city: result.cleanCity,
            postal_code: result.cleanPostalCode || job.postal_code,
            zone_id: result.zoneId,
          })
          .eq('id', job.id);

        updatedJobsCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalJobsScanned: jobs?.length || 0,
      updatedJobsCount,
      newlyCreatedZonesCount,
    });
  } catch (err: unknown) {
    console.error('POST /api/zones/scan error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
