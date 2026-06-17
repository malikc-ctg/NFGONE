import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json({ error: 'Missing invite ID' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: contractor, error } = await supabase
      .from('contractors')
      .select('id, full_name, email, phone, status, notes')
      .eq('id', inviteId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to verify invite: ${error.message}`);
    }

    if (!contractor) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (contractor.status !== 'invited') {
      return NextResponse.json({ error: 'This invite has already been accepted or is no longer valid.' }, { status: 400 });
    }

    return NextResponse.json({ contractor });

  } catch (err: any) {
    console.error('Verify invite error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
