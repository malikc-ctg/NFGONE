import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();

    // 1. Fetch zones
    const { data: zones, error: zoneError } = await supabase.from('zones').select('id, name, city');
    if (zoneError) throw zoneError;

    // 2. Fetch completed/paid jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, zone_id, service_type, quoted_price, final_price, status, estimated_duration_minutes')
      .in('status', ['completed', 'reviewed', 'paid_out']);

    if (jobsError) throw jobsError;

    const allJobs = jobs || [];

    // Zone Economics Map
    const zoneMetrics: Record<string, {
      zoneId: string;
      zoneName: string;
      city: string;
      totalJobs: number;
      revenue: number;
      laborCost: number;
      grossProfit: number;
      grossMargin: number;
      avgTicket: number;
    }> = {};

    (zones || []).forEach((z) => {
      zoneMetrics[z.id] = {
        zoneId: z.id,
        zoneName: z.name,
        city: z.city || 'GTA',
        totalJobs: 0,
        revenue: 0,
        laborCost: 0,
        grossProfit: 0,
        grossMargin: 0,
        avgTicket: 0,
      };
    });

    // Service Type Economics Map
    const serviceMetrics: Record<string, {
      serviceType: string;
      jobCount: number;
      totalRevenue: number;
      totalLaborCost: number;
      grossProfit: number;
      avgTicket: number;
      avgMargin: number;
    }> = {};

    allJobs.forEach((job) => {
      const price = Number(job.final_price || job.quoted_price || 0);
      const labor = Math.round(price * 0.65 * 100) / 100; // 65% labor baseline
      const profit = Math.max(0, price - labor);

      // By Zone
      if (job.zone_id && zoneMetrics[job.zone_id]) {
        zoneMetrics[job.zone_id].totalJobs += 1;
        zoneMetrics[job.zone_id].revenue += price;
        zoneMetrics[job.zone_id].laborCost += labor;
        zoneMetrics[job.zone_id].grossProfit += profit;
      }

      // By Service Type
      const sType = job.service_type || 'standard_clean';
      if (!serviceMetrics[sType]) {
        serviceMetrics[sType] = {
          serviceType: sType,
          jobCount: 0,
          totalRevenue: 0,
          totalLaborCost: 0,
          grossProfit: 0,
          avgTicket: 0,
          avgMargin: 0,
        };
      }
      serviceMetrics[sType].jobCount += 1;
      serviceMetrics[sType].totalRevenue += price;
      serviceMetrics[sType].totalLaborCost += labor;
      serviceMetrics[sType].grossProfit += profit;
    });

    // Calculate margins
    const zoneList = Object.values(zoneMetrics).map((z) => {
      const margin = z.revenue > 0 ? (z.grossProfit / z.revenue) * 100 : 0;
      const avg = z.totalJobs > 0 ? z.revenue / z.totalJobs : 0;
      return {
        ...z,
        grossMargin: Math.round(margin * 10) / 10,
        avgTicket: Math.round(avg * 100) / 100,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const serviceList = Object.values(serviceMetrics).map((s) => {
      const margin = s.totalRevenue > 0 ? (s.grossProfit / s.totalRevenue) * 100 : 0;
      const avg = s.jobCount > 0 ? s.totalRevenue / s.jobCount : 0;
      return {
        ...s,
        avgMargin: Math.round(margin * 10) / 10,
        avgTicket: Math.round(avg * 100) / 100,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totalCompanyRevenue = allJobs.reduce((sum, j) => sum + Number(j.final_price || j.quoted_price || 0), 0);
    const totalCompanyLabor = Math.round(totalCompanyRevenue * 0.65 * 100) / 100;
    const companyProfit = totalCompanyRevenue - totalCompanyLabor;
    const companyMargin = totalCompanyRevenue > 0 ? Math.round((companyProfit / totalCompanyRevenue) * 1000) / 10 : 0;

    return NextResponse.json({
      zones: zoneList,
      services: serviceList,
      summary: {
        totalRevenue: totalCompanyRevenue,
        totalLaborCost: totalCompanyLabor,
        grossProfit: companyProfit,
        companyMargin,
        totalJobs: allJobs.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
