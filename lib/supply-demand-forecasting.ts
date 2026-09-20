// Sea of Blue — Supply Demand Forecasting & Store Shopping Lists
// Correlates upcoming booked jobs with service package formulas to project
// inventory burn rate, days-of-supply, and generates Home Depot & Amazon shopping lists.

import { createServiceClient } from '@/lib/supabase/server';

export interface ProjectedBurnItem {
  itemId: string;
  itemName: string;
  sku: string | null;
  category: string;
  unit: string;
  quantityOnHand: number;
  reorderThreshold: number;
  projectedBurn14Days: number;
  projectedEndStock: number;
  daysOfSupplyRemaining: number;
  costPerUnit: number;
  status: 'critical_stockout' | 'low_stock' | 'adequate';
  homeDepotSku?: string | null;
  amazonAsin?: string | null;
  preferredStore: 'Home Depot' | 'Amazon' | 'Janitorial Supply' | 'Other';
}

export interface StoreShoppingItem {
  itemId: string;
  name: string;
  storeCode: string; // Home Depot SKU or Amazon ASIN
  recommendedQty: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  reason: string;
  storeUrl?: string;
  urgency: 'high' | 'medium';
}

export interface DemandForecastResult {
  totalUpcomingJobs: number;
  jobsBreakdown: Record<string, number>;
  items: ProjectedBurnItem[];
  homeDepotShoppingList: StoreShoppingItem[];
  amazonShoppingList: StoreShoppingItem[];
  estimatedTotalRestockBudget: number;
}

export async function calculateSupplyDemand(zoneId?: string): Promise<DemandForecastResult> {
  const supabase = await createServiceClient();

  // 1. Fetch upcoming confirmed/assigned jobs for the next 14 days
  const now = new Date();
  const future14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  let jobsQuery = supabase
    .from('jobs')
    .select('id, service_type, status, zone_id, scheduled_date')
    .gte('scheduled_date', now.toISOString().split('T')[0])
    .lte('scheduled_date', future14.toISOString().split('T')[0])
    .not('status', 'in', '("cancelled","refunded","disputed")');

  if (zoneId && zoneId !== 'all') {
    jobsQuery = jobsQuery.eq('zone_id', zoneId);
  }

  const { data: rawJobs } = await jobsQuery;
  const jobs = rawJobs || [];

  const jobsBreakdown: Record<string, number> = {
    standard_clean: 0,
    deep_clean: 0,
    move_in_clean: 0,
    move_out_clean: 0,
    recurring_standard: 0,
    recurring_deep: 0,
    other: 0,
  };

  for (const j of jobs) {
    const st = j.service_type || 'standard_clean';
    if (jobsBreakdown[st] !== undefined) {
      jobsBreakdown[st]++;
    } else {
      jobsBreakdown.other++;
    }
  }

  // Calculate equivalent standard clean loads:
  // Deep/Move cleans consume ~2.5x standard supplies
  const totalStandardEquivalents =
    (jobsBreakdown.standard_clean || 0) * 1.0 +
    (jobsBreakdown.recurring_standard || 0) * 1.0 +
    (jobsBreakdown.deep_clean || 0) * 2.5 +
    (jobsBreakdown.recurring_deep || 0) * 2.5 +
    (jobsBreakdown.move_in_clean || 0) * 2.5 +
    (jobsBreakdown.move_out_clean || 0) * 2.5 +
    (jobsBreakdown.other || 0) * 1.5;

  // 2. Fetch inventory items & on-hand stock
  let invQuery = supabase
    .from('supply_inventory')
    .select('quantity_on_hand, item:supply_items(*)');

  if (zoneId && zoneId !== 'all') {
    invQuery = invQuery.eq('zone_id', zoneId);
  }

  const { data: rawInv } = await invQuery;

  // Aggregate quantity on hand per item across matching zones
  const itemMap = new Map<
    string,
    { item: any; totalQty: number }
  >();

  for (const row of rawInv || []) {
    const rawItem = Array.isArray(row.item) ? row.item[0] : row.item;
    if (!rawItem || !(rawItem as any).id) continue;
    const itemObj = rawItem as any;
    const existing = itemMap.get(itemObj.id);
    if (existing) {
      existing.totalQty += row.quantity_on_hand || 0;
    } else {
      itemMap.set(itemObj.id, {
        item: itemObj,
        totalQty: row.quantity_on_hand || 0,
      });
    }
  }

  const projectedItems: ProjectedBurnItem[] = [];
  const homeDepotList: StoreShoppingItem[] = [];
  const amazonList: StoreShoppingItem[] = [];
  let totalRestockBudget = 0;

  for (const [itemId, entry] of Array.from(itemMap.entries())) {
    const item = entry.item;
    const onHand = entry.totalQty;
    const category = (item.category || '').toLowerCase();
    const isDurable = category === 'tool' || category === 'equipment';
    const threshold = item.reorder_threshold ?? 2;
    const cost = item.cost_per_unit || 8.5;

    let projectedBurn = 0;
    let projectedEnd = onHand;
    let dailyBurnRate = 0;
    let daysOfSupply = 999;
    let status: 'critical_stockout' | 'low_stock' | 'adequate' = 'adequate';

    if (!isDurable) {
      // Estimate burn based on category / units per kit for true consumables:
      let burnPerJob = item.avg_usage_per_job || 0.25;
      if (item.units_per_kit_deep && item.units_per_kit_deep > 0) {
        burnPerJob = item.units_per_kit_deep * 0.4 + (item.units_per_kit_standard || 0.15) * 0.6;
      } else {
        const lowerName = item.name.toLowerCase();
        if (lowerName.includes('degreaser')) burnPerJob = 0.3;
        else if (lowerName.includes('disinfectant') || lowerName.includes('all-purpose')) burnPerJob = 0.35;
        else if (lowerName.includes('glass')) burnPerJob = 0.2;
        else if (lowerName.includes('towel') || lowerName.includes('microfiber')) burnPerJob = 0.4;
        else if (lowerName.includes('glove')) burnPerJob = 0.8;
        else if (lowerName.includes('liner') || lowerName.includes('trash')) burnPerJob = 1.0;
      }

      projectedBurn = Math.ceil(totalStandardEquivalents * burnPerJob);
      projectedEnd = Math.max(0, onHand - projectedBurn);
      dailyBurnRate = projectedBurn / 14;
      daysOfSupply =
        dailyBurnRate > 0 ? Math.round(onHand / dailyBurnRate) : onHand > 0 ? 99 : 0;

      if (onHand <= 0 || projectedEnd <= 0) {
        status = 'critical_stockout';
      } else if (onHand <= threshold || projectedEnd <= threshold) {
        status = 'low_stock';
      }
    } else {
      // Durable tools / machinery: only 1 or 2 needed per crew, zero burn per job
      projectedBurn = 0;
      projectedEnd = onHand;
      daysOfSupply = 999;
      status = 'adequate';
    }

    const preferredStore = (item.preferred_store ||
      (item.amazon_asin ? 'Amazon' : 'Home Depot')) as ProjectedBurnItem['preferredStore'];

    projectedItems.push({
      itemId,
      itemName: item.name,
      sku: item.sku,
      category: item.category || 'consumable',
      unit: item.unit || 'units',
      quantityOnHand: onHand,
      reorderThreshold: threshold,
      projectedBurn14Days: projectedBurn,
      projectedEndStock: projectedEnd,
      daysOfSupplyRemaining: daysOfSupply,
      costPerUnit: cost,
      status,
      homeDepotSku: item.home_depot_sku,
      amazonAsin: item.amazon_asin,
      preferredStore,
    });

    // If restock is needed, generate shopping recommendation (CONSUMABLES ONLY!)
    if (!isDurable && status !== 'adequate') {
      const deficit = Math.max(threshold - onHand, projectedBurn + threshold - onHand, 1);
      const recQty = Math.max(1, Math.min(10, Math.ceil(deficit)));
      const lineCost = recQty * cost;
      totalRestockBudget += lineCost;

      const storeItem: StoreShoppingItem = {
        itemId,
        name: item.name,
        storeCode:
          preferredStore === 'Amazon'
            ? item.amazon_asin || item.sku || 'AMZ-SEARCH'
            : item.home_depot_sku || item.sku || 'HD-SEARCH',
        recommendedQty: recQty,
        unit: item.unit || 'units',
        unitCost: cost,
        totalCost: parseFloat(lineCost.toFixed(2)),
        reason:
          status === 'critical_stockout'
            ? `Stock critically low (${onHand} on hand, ~${projectedBurn} needed for ${jobs.length} jobs)`
            : `Below reorder threshold (${onHand}/${threshold} on hand)`,
        urgency: status === 'critical_stockout' ? 'high' : 'medium',
        storeUrl:
          preferredStore === 'Amazon' && item.amazon_asin
            ? `https://www.amazon.ca/dp/${item.amazon_asin}`
            : preferredStore === 'Home Depot' && item.home_depot_sku
            ? `https://www.homedepot.ca/en/home/search.html?q=${encodeURIComponent(item.home_depot_sku)}`
            : undefined,
      };

      if (preferredStore === 'Amazon') {
        amazonList.push(storeItem);
      } else {
        homeDepotList.push(storeItem);
      }
    }
  }

  // Sort projected items: critical first
  projectedItems.sort((a, b) => {
    const rank = { critical_stockout: 0, low_stock: 1, adequate: 2 };
    return rank[a.status] - rank[b.status] || a.daysOfSupplyRemaining - b.daysOfSupplyRemaining;
  });

  return {
    totalUpcomingJobs: jobs.length,
    jobsBreakdown,
    items: projectedItems,
    homeDepotShoppingList: homeDepotList,
    amazonShoppingList: amazonList,
    estimatedTotalRestockBudget: parseFloat(totalRestockBudget.toFixed(2)),
  };
}
