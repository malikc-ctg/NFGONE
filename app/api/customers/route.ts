import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const body = await request.json();

    const { full_name, email, phone, address_line1, address_line2,
            city, province, postal_code, zone_id, notes } = body;

    if (!full_name || !email || !phone) {
      return NextResponse.json({ error: 'name, email, phone required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        full_name, email, phone, address_line1, address_line2,
        city, province: province ?? 'ON', postal_code, zone_id, notes,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*, zone:zones(*)')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
