import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { qboFetch } from '@/lib/quickbooks/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();

    // 1. Fetch active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, email, phone, payout_rate, hourly_wage, tier, status')
      .neq('status', 'deleted');

    if (empError) throw empError;

    // 2. Fetch completed/reviewed/paid_out jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, service_type, quoted_price, final_price, status, scheduled_date, assigned_employee_id, customer:customers(full_name)')
      .in('status', ['completed', 'reviewed', 'paid_out'])
      .order('scheduled_date', { ascending: false });

    if (jobsError) throw jobsError;

    // 3. Aggregate payroll per employee
    const cleanerPayrollMap: Record<string, {
      employee: any;
      completedJobs: any[];
      grossRevenue: number;
      commissionEarnings: number;
      tips: number;
      bonuses: number;
      deductions: number;
      netPayout: number;
      unpaidCount: number;
      paidCount: number;
    }> = {};

    (employees || []).forEach((emp) => {
      cleanerPayrollMap[emp.id] = {
        employee: emp,
        completedJobs: [],
        grossRevenue: 0,
        commissionEarnings: 0,
        tips: 0,
        bonuses: 0,
        deductions: 0,
        netPayout: 0,
        unpaidCount: 0,
        paidCount: 0,
      };
    });

    (jobs || []).forEach((job) => {
      const empId = job.assigned_employee_id;
      if (!empId || !cleanerPayrollMap[empId]) return;

      const rate = cleanerPayrollMap[empId].employee.payout_rate || 0.65; // default 65%
      const jobAmount = Number(job.final_price || job.quoted_price || 0);
      const earned = Math.round(jobAmount * rate * 100) / 100;

      cleanerPayrollMap[empId].completedJobs.push({
        ...job,
        cleanerEarned: earned,
      });

      cleanerPayrollMap[empId].grossRevenue += jobAmount;
      cleanerPayrollMap[empId].commissionEarnings += earned;

      if (job.status === 'paid_out') {
        cleanerPayrollMap[empId].paidCount += 1;
      } else {
        cleanerPayrollMap[empId].unpaidCount += 1;
        cleanerPayrollMap[empId].netPayout += earned;
      }
    });

    const payrollSummary = Object.values(cleanerPayrollMap).filter(p => p.completedJobs.length > 0);
    const totalPendingPayout = payrollSummary.reduce((sum, p) => sum + p.netPayout, 0);
    const totalPaidOutYtd = payrollSummary.reduce((sum, p) => sum + (p.commissionEarnings - p.netPayout), 0);

    return NextResponse.json({
      cleaners: payrollSummary,
      totalPendingPayout,
      totalPaidOutYtd,
      totalCleaners: payrollSummary.length,
    });
  } catch (err: any) {
    console.error('Payroll API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { employeeId, jobIds, action } = body;

    if (!employeeId || !jobIds || !Array.isArray(jobIds)) {
      return NextResponse.json({ error: 'Missing employeeId or jobIds' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    if (action === 'mark_paid') {
      // Mark selected jobs as 'paid_out'
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: 'paid_out', updated_at: new Date().toISOString() })
        .in('id', jobIds);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, message: `${jobIds.length} jobs marked as paid out.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
