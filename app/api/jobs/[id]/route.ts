import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServiceClient();
    
    // Bypass authentication as requested by the user to auto-load admin console
    const isAdmin = true;

    const { data, error } = await supabase
      .from('jobs')
      .select('*, customer:customers(*), employee:employees(*), zone:zones(*)')
      .eq('id', params.id)
      .single();

    if (error) throw error;
    
    // Security check bypassed

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error(`Error fetching job ${params.id}:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();
    const { customer, employee, zone, ...updateData } = body;

    const { data, error } = await supabase
      .from('jobs')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Cascade relevant updates to Customer
    if (data.customer_id) {
      const custUpdate: any = {};
      if (body.city !== undefined) custUpdate.city = body.city;
      // You can expand this if jobs start tracking customer name/phone directly
      
      if (Object.keys(custUpdate).length > 0) {
        await supabase.from('customers').update(custUpdate).eq('id', data.customer_id);
      }
    }

    // Refresh finance PnL if price or status might have changed
    try {
      await supabase.rpc('refresh_zone_monthly_pnl');
    } catch (pnlError) {
      console.error('Failed to refresh PnL view:', pnlError);
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error(`Error updating job ${params.id}:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
