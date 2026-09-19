import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();

    // 1. Fetch recurring bookings with customer info
    const { data: recurring, error } = await supabase
      .from('recurring_bookings')
      .select('*, customer:customers(full_name, email, created_at)');

    if (error) throw error;

    const contracts = recurring || [];

    // Helper to compute monthly value
    const getMonthlyValue = (quotedPrice: number, frequency: string): number => {
      const price = Number(quotedPrice || 0);
      switch (frequency) {
        case 'weekly':
          return Math.round(price * 4.33 * 100) / 100;
        case 'biweekly':
          return Math.round(price * 2.16 * 100) / 100;
        case 'monthly':
        default:
          return price;
      }
    };

    let activeMrr = 0;
    let activeSubscriptions = 0;
    let pausedSubscriptions = 0;
    let weeklyCount = 0;
    let biweeklyCount = 0;
    let monthlyCount = 0;

    const subscriptionList = contracts.map((c: any) => {
      const mrr = getMonthlyValue(c.quoted_price, c.frequency);
      if (c.is_active) {
        activeMrr += mrr;
        activeSubscriptions += 1;
        if (c.frequency === 'weekly') weeklyCount++;
        else if (c.frequency === 'biweekly') biweeklyCount++;
        else monthlyCount++;
      } else {
        pausedSubscriptions += 1;
      }

      return {
        id: c.id,
        customerName: c.customer?.full_name || 'Valued Customer',
        customerEmail: c.customer?.email,
        serviceType: c.service_type,
        frequency: c.frequency,
        quotedPrice: Number(c.quoted_price),
        monthlyValue: mrr,
        isActive: c.is_active,
        nextJobDate: c.next_job_date,
      };
    });

    const arr = Math.round(activeMrr * 12);
    const avgTicketPerClean = activeSubscriptions > 0
      ? Math.round((contracts.filter((c: any) => c.is_active).reduce((sum: number, c: any) => sum + Number(c.quoted_price), 0) / activeSubscriptions) * 100) / 100
      : 0;

    // Estimated LTV assuming 10-month average recurring client retention
    const estimatedLtv = Math.round(avgTicketPerClean * 18); // ~18 cleans per lifetime average
    const targetCac = Math.round(estimatedLtv * 0.25); // 4:1 LTV:CAC target

    return NextResponse.json({
      activeMrr: Math.round(activeMrr * 100) / 100,
      annualRunRate: arr,
      activeSubscriptions,
      pausedSubscriptions,
      avgTicketPerClean,
      estimatedLtv,
      targetCac,
      breakdown: {
        weekly: weeklyCount,
        biweekly: biweeklyCount,
        monthly: monthlyCount,
      },
      subscriptions: subscriptionList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
