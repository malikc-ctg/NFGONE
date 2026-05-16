import { NextRequest, NextResponse } from 'next/server';
import { createRestockOrder } from '@/lib/supply-management';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
  // Auth check
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { item_id, zone_id, quantity_ordered, notes } = body;

    if (!item_id || !quantity_ordered) {
      return NextResponse.json({ error: 'item_id and quantity_ordered required' }, { status: 400 });
    }

    await createRestockOrder({ item_id, zone_id: zone_id ?? null, quantity_ordered, notes });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
