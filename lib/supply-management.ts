// Sea of Blue — Supply Management

import { createServiceClient } from '@/lib/supabase/server';

export async function getInventoryWithAlerts(zoneId?: string) {
  const supabase = await createServiceClient();

  let query = supabase
    .from('supply_inventory')
    .select('*, item:supply_items(*), zone:zones(name)')
    .order('last_updated', { ascending: true });

  if (zoneId) query = query.eq('zone_id', zoneId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    is_low_stock: row.quantity_on_hand <= (row.item?.reorder_threshold ?? 20),
  }));
}

export async function assignSupplyToJob(params: {
  job_id: string;
  employee_id: string;
  zone_id: string;
  assignments: Array<{ item_id: string; quantity: number }>;
}): Promise<void> {
  const supabase = await createServiceClient();

  for (const a of params.assignments) {
    await supabase.from('supply_assignments').insert({
      job_id: params.job_id,
      employee_id: params.employee_id,
      item_id: a.item_id,
      quantity_assigned: a.quantity,
    });

    const { data: inv } = await supabase
      .from('supply_inventory')
      .select('quantity_on_hand, id')
      .eq('item_id', a.item_id)
      .eq('zone_id', params.zone_id)
      .single();

    if (inv) {
      await supabase
        .from('supply_inventory')
        .update({ quantity_on_hand: Math.max(0, inv.quantity_on_hand - a.quantity), last_updated: new Date().toISOString() })
        .eq('id', inv.id);
    }
  }
}

export async function recordSupplyReturn(assignmentId: string, quantityReturned: number): Promise<void> {
  const supabase = await createServiceClient();

  const { data: assignment } = await supabase
    .from('supply_assignments')
    .select('*, job:jobs(zone_id)')
    .eq('id', assignmentId)
    .single();

  if (!assignment) return;

  await supabase.from('supply_assignments').update({
    quantity_returned: quantityReturned,
    returned_at: new Date().toISOString(),
  }).eq('id', assignmentId);

  const zoneId = (assignment.job as { zone_id: string }).zone_id;
  const { data: inv } = await supabase
    .from('supply_inventory')
    .select('quantity_on_hand, id')
    .eq('item_id', assignment.item_id)
    .eq('zone_id', zoneId)
    .single();

  if (inv) {
    await supabase.from('supply_inventory').update({
      quantity_on_hand: inv.quantity_on_hand + quantityReturned,
      last_updated: new Date().toISOString(),
    }).eq('id', inv.id);
  }
}

export async function getLowStockAlerts() {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('supply_inventory')
    .select('*, item:supply_items(*), zone:zones(name)')
    .order('quantity_on_hand', { ascending: true });
  return (data ?? []).filter((row) => row.quantity_on_hand <= (row.item?.reorder_threshold ?? 20));
}

export async function createRestockOrder(params: {
  item_id: string;
  zone_id: string | null;
  quantity_ordered: number;
  notes?: string;
}): Promise<void> {
  const supabase = await createServiceClient();
  const { data: item } = await supabase.from('supply_items').select('cost_per_unit').eq('id', params.item_id).single();
  const costTotal = item?.cost_per_unit ? (item.cost_per_unit as number) * params.quantity_ordered : null;
  await supabase.from('supply_restock_orders').insert({ ...params, cost_total: costTotal, status: 'pending' });
}

export async function receiveRestockOrder(orderId: string): Promise<void> {
  const supabase = await createServiceClient();
  const { data: order } = await supabase.from('supply_restock_orders').select('*').eq('id', orderId).single();
  if (!order) return;

  await supabase.from('supply_restock_orders').update({ status: 'received', received_at: new Date().toISOString() }).eq('id', orderId);

  const { data: inv } = await supabase.from('supply_inventory').select('id, quantity_on_hand').eq('item_id', order.item_id).eq('zone_id', order.zone_id).single();

  if (inv) {
    await supabase.from('supply_inventory').update({ quantity_on_hand: inv.quantity_on_hand + order.quantity_ordered, last_restocked_at: new Date().toISOString(), last_updated: new Date().toISOString() }).eq('id', inv.id);
  } else {
    await supabase.from('supply_inventory').insert({ item_id: order.item_id, zone_id: order.zone_id, quantity_on_hand: order.quantity_ordered, last_restocked_at: new Date().toISOString() });
  }
}
