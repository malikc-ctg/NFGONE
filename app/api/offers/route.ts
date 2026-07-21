import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get employee ID using service client to avoid RLS hurdles
    const { createServiceClient } = await import('@/lib/supabase/server');
    const serviceClient = await createServiceClient();
    
    const { data: employee } = await serviceClient
      .from('employees')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found in database' }, { status: 404 });
    }


    // Get pending offers using service client
    const { data: offers, error } = await serviceClient
      .from('job_offers')
      .select('*, job:jobs(*)')
      .eq('employee_id', employee.id)
      .eq('status', 'pending')
      .order('offered_at', { ascending: false });

    if (error) throw error;


    // Filter out offers where the job is already assigned or taken
    // (Though respond/route.ts should handle this by marking them declined, 
    // it's good to be safe)
    const validOffers = (offers || []).filter(o => o.job && o.job.status === 'offered');

    return NextResponse.json(validOffers);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
