import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    
    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    const { data, error } = await supabase
      .from('jobs')
      .select('*, customer:customers(*), contractor:contractors(*), zone:zones(*)')
      .eq('id', params.id)
      .single();

    if (error) throw error;
    
    // Security check for non-admins
    if (!isAdmin) {
      if (profile?.role === 'contractor') {
        const { data: contractor } = await supabase
          .from('contractors')
          .select('id')
          .eq('profile_id', auth.id)
          .single();

        const contractorId = contractor?.id;

        // Must be assigned to the job, OR have a pending offer for it
        if (data.assigned_contractor_id !== contractorId) {
          const { data: offer } = await supabase
            .from('job_offers')
            .select('id')
            .eq('job_id', data.id)
            .eq('contractor_id', contractorId)
            .single();
            
          if (!offer) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }
      } else if (profile?.role === 'customer') {
        if (data.customer_id !== auth.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

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

    const { data, error } = await supabase
      .from('jobs')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error(`Error updating job ${params.id}:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
