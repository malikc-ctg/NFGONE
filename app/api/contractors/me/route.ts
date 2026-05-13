import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: contractor, error: dbError } = await supabase
      .from('contractors')
      .select('*, zone:zones(*)')
      .eq('profile_id', user.id)
      .single();

    if (dbError) {
      console.error('Database error fetching contractor:', dbError);
      return NextResponse.json({ error: `Contractor profile not found: ${dbError.message}` }, { status: 404 });
    }

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found (empty result)' }, { status: 404 });
    }


    return NextResponse.json(contractor);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
