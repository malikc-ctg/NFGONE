import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getProfitAndLoss, getTaxSummary } from '@/lib/quickbooks/reports';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const startOfYear = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().split('T')[0];

    // 1. Fetch live P&L and Tax numbers from QuickBooks
    const [pnl, taxData] = await Promise.all([
      getProfitAndLoss(startOfYear, today),
      getTaxSummary(startOfYear, today),
    ]);

    // CRA GST/HST Netfile Worksheet calculation
    const line101 = Math.round(pnl.income * 100) / 100; // Sales
    const line105 = Math.round(taxData.taxCollected * 100) / 100; // GST/HST collected
    const line108 = Math.round(taxData.taxPaid * 100) / 100; // ITCs claimed
    const line109 = Math.round((line105 - line108) * 100) / 100; // Net Tax

    // 2. Fetch cleaner payouts from database for WSIB and T4A/T5018
    const supabase = await createServiceClient();
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, email, phone, payout_rate, status')
      .neq('status', 'deleted');

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, quoted_price, final_price, assigned_employee_id, status')
      .in('status', ['completed', 'reviewed', 'paid_out']);

    const cleanerGrossMap: Record<string, { employee: any; grossEarnings: number; jobCount: number }> = {};

    (employees || []).forEach((emp) => {
      cleanerGrossMap[emp.id] = { employee: emp, grossEarnings: 0, jobCount: 0 };
    });

    (jobs || []).forEach((job) => {
      if (job.assigned_employee_id && cleanerGrossMap[job.assigned_employee_id]) {
        const rate = cleanerGrossMap[job.assigned_employee_id].employee.payout_rate || 0.65;
        const price = Number(job.final_price || job.quoted_price || 0);
        cleanerGrossMap[job.assigned_employee_id].grossEarnings += price * rate;
        cleanerGrossMap[job.assigned_employee_id].jobCount += 1;
      }
    });

    const contractorReport = Object.values(cleanerGrossMap)
      .map((c) => ({
        cleanerName: c.employee.full_name,
        cleanerEmail: c.employee.email,
        cleanerPhone: c.employee.phone,
        grossEarnings: Math.round(c.grossEarnings * 100) / 100,
        jobCount: c.jobCount,
        requiresT4aSlip: c.grossEarnings >= 500, // CRA threshold is $500 CAD
      }))
      .filter((c) => c.grossEarnings > 0)
      .sort((a, b) => b.grossEarnings - a.grossEarnings);

    const totalInsurableEarnings = contractorReport.reduce((sum, c) => sum + c.grossEarnings, 0);

    // Ontario WSIB Janitorial / Building Cleaning rate benchmark: ~$2.35 per $100 of gross payroll
    const wsibRatePer100 = 2.35;
    const estimatedWsibPremium = Math.round((totalInsurableEarnings / 100) * wsibRatePer100 * 100) / 100;
    const quarterlyWsibEstimate = Math.round((estimatedWsibPremium / 4) * 100) / 100;

    return NextResponse.json({
      craNetfile: {
        businessNumber: '774623375RT0001',
        reportingPeriod: `Jan 1, ${now.getFullYear()} – Present`,
        line101_sales: line101,
        line105_collected: line105,
        line108_itcs: line108,
        line109_netTax: line109,
        filingFrequency: 'Quarterly',
        status: line109 > 0 ? 'Payment Due' : 'Refund / Nil',
      },
      wsib: {
        province: 'Ontario',
        rateGroup: 'Class G1: Building Cleaning & Janitorial',
        wsibRatePer100,
        totalInsurableEarnings: Math.round(totalInsurableEarnings * 100) / 100,
        estimatedWsibAnnualPremium: estimatedWsibPremium,
        estimatedWsibQuarterlyPremium: quarterlyWsibEstimate,
      },
      subcontractorT4a: {
        thresholdAmount: 500,
        totalContractors: contractorReport.length,
        contractorsRequiringSlip: contractorReport.filter((c) => c.requiresT4aSlip).length,
        contractors: contractorReport,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
