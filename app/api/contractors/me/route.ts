import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: contractor, error } = await supabase
      .from('contractors')
      .select('*, zone:zones(*)')
      .eq('profile_id', user.id)
      .single();

    if (error || !contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    return NextResponse.json(contractor);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
