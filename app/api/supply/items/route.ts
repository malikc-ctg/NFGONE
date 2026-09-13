import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('supply_items')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await request.json();

    const {
      name,
      sku,
      unit,
      reorder_threshold,
      cost_per_unit,
      initial_quantity,
      zone_id,
      supplier_url,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    const { data: item, error: itemError } = await supabase
      .from('supply_items')
      .insert({
        name: name.trim(),
        sku: sku?.trim() || null,
        unit: unit?.trim() || 'units',
        reorder_threshold: typeof reorder_threshold === 'number' ? reorder_threshold : parseInt(reorder_threshold || '10', 10),
        cost_per_unit: cost_per_unit != null && cost_per_unit !== '' ? parseFloat(cost_per_unit) : null,
        supplier_url: supplier_url?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (itemError) throw itemError;

    const initialQty = typeof initial_quantity === 'number' ? initial_quantity : parseInt(initial_quantity || '0', 10);
    const targetZoneId = zone_id && zone_id !== 'all' ? zone_id : null;

    const { data: inv, error: invError } = await supabase
      .from('supply_inventory')
      .insert({
        item_id: item.id,
        zone_id: targetZoneId,
        quantity_on_hand: Math.max(0, initialQty),
        last_restocked_at: initialQty > 0 ? new Date().toISOString() : null,
        last_updated: new Date().toISOString(),
      })
      .select('*, item:supply_items(*), zone:zones(name)')
      .single();

    if (invError) throw invError;

    return NextResponse.json(
      {
        ...inv,
        is_low_stock: inv.quantity_on_hand <= (item.reorder_threshold ?? 10),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Error creating supply item:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
