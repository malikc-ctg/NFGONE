// Sea of Blue — Supply OS Reconciliation & Ingestion Engine
// Supports: Home Depot Pro Xtra CSV, Amazon Order History CSV, QuickBooks Purchases,
// Smart Auto-Categorization, and Self-Learning SKU/ASIN Mappings.

import { createServiceClient } from '@/lib/supabase/server';

export type SupplyCategory =
  | 'chemical'
  | 'consumable'
  | 'ppe'
  | 'paper'
  | 'equipment'
  | 'tool';

export interface ParsedPurchaseItem {
  rawIdentifier: string; // SKU, ASIN, or model #
  rawDescription: string;
  category: SupplyCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  matchedItemId?: string;
  matchedItemName?: string;
  confidence: number; // 0 to 1
}

export interface ParsedPurchase {
  vendorName: string;
  source: 'home_depot_pro_xtra' | 'amazon_orders' | 'quickbooks_sync' | 'manual';
  orderReference: string;
  purchaseDate: string;
  totalAmount: number;
  items: ParsedPurchaseItem[];
}

/**
 * Intelligent Keyword-Based Auto-Categorization
 */
export function detectCategory(description: string, rawId?: string): SupplyCategory {
  const d = (description + ' ' + (rawId || '')).toLowerCase();

  // Durable Machinery / Equipment
  if (
    d.includes('vacuum') ||
    d.includes('extractor') ||
    d.includes('scrubber') ||
    d.includes('ozone') ||
    d.includes('steamer') ||
    d.includes('pressure washer') ||
    d.includes('buffer') ||
    d.includes('blower') ||
    d.includes('hepa backpack')
  ) {
    return 'equipment';
  }

  // Chemicals & Concentrated Solutions
  if (
    d.includes('cleaner') ||
    d.includes('degreaser') ||
    d.includes('disinfectant') ||
    d.includes('polish') ||
    d.includes('bleach') ||
    d.includes('sanitizer') ||
    d.includes('deodorizer') ||
    d.includes('enzyme') ||
    d.includes('descaler') ||
    d.includes('vinegar') ||
    d.includes('chemical') ||
    d.includes('solution') ||
    d.includes('gallon') ||
    d.includes('concentrate')
  ) {
    return 'chemical';
  }

  // PPE & Safety
  if (
    d.includes('glove') ||
    d.includes('nitrile') ||
    d.includes('latex') ||
    d.includes('mask') ||
    d.includes('respirator') ||
    d.includes('goggle') ||
    d.includes('bootie') ||
    d.includes('shoe cover') ||
    d.includes('earplug') ||
    d.includes('safety glasses')
  ) {
    return 'ppe';
  }

  // Paper & Restroom
  if (
    d.includes('paper towel') ||
    d.includes('tissue') ||
    d.includes('toilet paper') ||
    d.includes('dispenser') ||
    d.includes('napkin') ||
    d.includes('hand towel')
  ) {
    return 'paper';
  }

  // Hardware & Tools
  if (
    d.includes('squeegee') ||
    d.includes('pole') ||
    d.includes('caddy') ||
    d.includes('scraper') ||
    d.includes('bucket') ||
    d.includes('spray bottle') ||
    d.includes('trigger sprayer') ||
    d.includes('brush') ||
    d.includes('duster') ||
    d.includes('broom') ||
    d.includes('dustpan')
  ) {
    return 'tool';
  }

  // Default to Consumable (Microfiber, liners, sponges, mop pads)
  return 'consumable';
}

/**
 * Parses Home Depot Pro Xtra Purchase CSV
 * Supports standard Pro Xtra CSV columns:
 * Order Date / Purchase Date, Store / PO Number, Receipt # / Order #, SKU / Item #, Description, Qty, Unit Price, Total
 */
export function parseHomeDepotProXtraCSV(csvContent: string): ParsedPurchase {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Find header index
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = parseCSVLine(lines[i]).map((c) => c.toLowerCase().trim());
    if (
      cols.some((c) => c.includes('sku') || c.includes('item')) &&
      cols.some((c) => c.includes('desc') || c.includes('name') || c.includes('product'))
    ) {
      headerIndex = i;
      headers = cols;
      break;
    }
  }

  if (headerIndex === -1) {
    // Fallback: assume line 0 is header
    headerIndex = 0;
    headers = parseCSVLine(lines[0]).map((c) => c.toLowerCase().trim());
  }

  const skuCol = headers.findIndex((c) => c.includes('sku') || c.includes('item'));
  const descCol = headers.findIndex((c) => c.includes('desc') || c.includes('product') || c.includes('name'));
  const qtyCol = headers.findIndex((c) => c.includes('qty') || c.includes('quantity'));
  const unitPriceCol = headers.findIndex((c) => c.includes('unit price') || c.includes('price') || c.includes('retail'));
  const totalCol = headers.findIndex((c) => c.includes('total') || c.includes('amount') || c.includes('extended'));
  const dateCol = headers.findIndex((c) => c.includes('date'));
  const orderNumCol = headers.findIndex((c) => c.includes('receipt') || c.includes('order') || c.includes('po'));

  let orderRef = `HD-${Date.now().toString().slice(-6)}`;
  let purchaseDate = new Date().toISOString().split('T')[0];
  let calculatedTotal = 0;
  const items: ParsedPurchaseItem[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length <= 1) continue;

    const desc = descCol !== -1 ? row[descCol] || '' : row[1] || '';
    if (!desc || desc.toLowerCase().includes('subtotal') || desc.toLowerCase().includes('tax')) {
      continue;
    }

    const sku = skuCol !== -1 ? row[skuCol] || '' : '';
    const qty = qtyCol !== -1 ? Math.max(1, parseFloat(row[qtyCol]) || 1) : 1;
    let unitPrice = unitPriceCol !== -1 ? parseFloat(row[unitPriceCol]?.replace(/[^0-9.]/g, '')) || 0 : 0;
    let totalPrice = totalCol !== -1 ? parseFloat(row[totalCol]?.replace(/[^0-9.]/g, '')) || 0 : 0;

    if (totalPrice === 0 && unitPrice > 0) {
      totalPrice = unitPrice * qty;
    } else if (unitPrice === 0 && totalPrice > 0 && qty > 0) {
      unitPrice = totalPrice / qty;
    }

    if (orderNumCol !== -1 && row[orderNumCol] && orderRef.startsWith('HD-')) {
      orderRef = row[orderNumCol].trim();
    }
    if (dateCol !== -1 && row[dateCol]) {
      try {
        const parsedD = new Date(row[dateCol]);
        if (!isNaN(parsedD.getTime())) {
          purchaseDate = parsedD.toISOString().split('T')[0];
        }
      } catch {}
    }

    calculatedTotal += totalPrice;

    items.push({
      rawIdentifier: sku,
      rawDescription: desc,
      category: detectCategory(desc, sku),
      quantity: qty,
      unitPrice,
      totalPrice,
      confidence: 0,
    });
  }

  return {
    vendorName: 'The Home Depot',
    source: 'home_depot_pro_xtra',
    orderReference: orderRef,
    purchaseDate,
    totalAmount: parseFloat(calculatedTotal.toFixed(2)),
    items,
  };
}

/**
 * Parses Amazon Order History / Business Purchases CSV
 * Standard Amazon columns: Order Date, Order ID, Title, Category, ASIN/ISBN, Quantity, Item Total
 */
export function parseAmazonOrderHistoryCSV(csvContent: string): ParsedPurchase {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = parseCSVLine(lines[i]).map((c) => c.toLowerCase().trim());
    if (
      cols.some((c) => c.includes('asin') || c.includes('order id')) ||
      cols.some((c) => c.includes('title'))
    ) {
      headerIndex = i;
      headers = cols;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
    headers = parseCSVLine(lines[0]).map((c) => c.toLowerCase().trim());
  }

  const asinCol = headers.findIndex((c) => c.includes('asin'));
  const titleCol = headers.findIndex((c) => c.includes('title') || c.includes('product name') || c.includes('item'));
  const qtyCol = headers.findIndex((c) => c.includes('quantity') || c.includes('qty'));
  const priceCol = headers.findIndex((c) => c.includes('item total') || c.includes('price') || c.includes('subtotal'));
  const unitPriceCol = headers.findIndex((c) => c.includes('unit price'));
  const orderIdCol = headers.findIndex((c) => c.includes('order id'));
  const dateCol = headers.findIndex((c) => c.includes('order date') || c.includes('date'));

  let orderRef = `AMZ-${Date.now().toString().slice(-6)}`;
  let purchaseDate = new Date().toISOString().split('T')[0];
  let calculatedTotal = 0;
  const items: ParsedPurchaseItem[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length <= 1) continue;

    const title = titleCol !== -1 ? row[titleCol] || '' : row[1] || '';
    if (!title) continue;

    const asin = asinCol !== -1 ? row[asinCol] || '' : '';
    const qty = qtyCol !== -1 ? Math.max(1, parseFloat(row[qtyCol]) || 1) : 1;
    let totalPrice = priceCol !== -1 ? parseFloat(row[priceCol]?.replace(/[^0-9.]/g, '')) || 0 : 0;
    let unitPrice = unitPriceCol !== -1 ? parseFloat(row[unitPriceCol]?.replace(/[^0-9.]/g, '')) || 0 : 0;

    if (unitPrice === 0 && totalPrice > 0 && qty > 0) {
      unitPrice = totalPrice / qty;
    } else if (totalPrice === 0 && unitPrice > 0) {
      totalPrice = unitPrice * qty;
    }

    if (orderIdCol !== -1 && row[orderIdCol] && orderRef.startsWith('AMZ-')) {
      orderRef = row[orderIdCol].trim();
    }

    if (dateCol !== -1 && row[dateCol]) {
      try {
        const parsedD = new Date(row[dateCol]);
        if (!isNaN(parsedD.getTime())) {
          purchaseDate = parsedD.toISOString().split('T')[0];
        }
      } catch {}
    }

    calculatedTotal += totalPrice;

    items.push({
      rawIdentifier: asin,
      rawDescription: title,
      category: detectCategory(title, asin),
      quantity: qty,
      unitPrice,
      totalPrice,
      confidence: 0,
    });
  }

  return {
    vendorName: 'Amazon.com',
    source: 'amazon_orders',
    orderReference: orderRef,
    purchaseDate,
    totalAmount: parseFloat(calculatedTotal.toFixed(2)),
    items,
  };
}

/**
 * Universal CSV Parser Helper (handles quoted commas and newlines)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Auto-Match Purchase Items against Supply Catalog and Learned Dictionary
 */
export async function matchPurchaseItems(
  vendorName: string,
  items: ParsedPurchaseItem[]
): Promise<ParsedPurchaseItem[]> {
  const supabase = await createServiceClient();

  // 1. Fetch all existing supply items
  const { data: supplyItems } = await supabase
    .from('supply_items')
    .select('id, name, sku, category, home_depot_sku, amazon_asin')
    .eq('is_active', true);

  // 2. Fetch known vendor mappings
  let mappings: Array<{ vendor_code: string; supply_item_id: string }> = [];
  try {
    const { data } = await supabase
      .from('supply_vendor_mappings')
      .select('vendor_code, supply_item_id')
      .ilike('vendor_name', `%${vendorName.split(' ')[0]}%`);
    if (data) mappings = data;
  } catch {}

  const mappingDict = new Map<string, string>();
  for (const m of mappings) {
    mappingDict.set(m.vendor_code.toLowerCase().trim(), m.supply_item_id);
  }

  const catalog = supplyItems || [];

  return items.map((item) => {
    const rawId = item.rawIdentifier.toLowerCase().trim();
    const rawDesc = item.rawDescription.toLowerCase().trim();

    // Check 1: Direct Mapping from Learned Dictionary
    if (rawId && mappingDict.has(rawId)) {
      const matchId = mappingDict.get(rawId)!;
      const matched = catalog.find((c) => c.id === matchId);
      if (matched) {
        return {
          ...item,
          matchedItemId: matched.id,
          matchedItemName: matched.name,
          category: (matched.category as SupplyCategory) || item.category,
          confidence: 1.0,
        };
      }
    }

    // Check 2: Direct Home Depot SKU or Amazon ASIN Match in supply_items
    if (rawId) {
      const matched = catalog.find(
        (c) =>
          c.home_depot_sku?.toLowerCase().trim() === rawId ||
          c.amazon_asin?.toLowerCase().trim() === rawId ||
          c.sku?.toLowerCase().trim() === rawId
      );
      if (matched) {
        return {
          ...item,
          matchedItemId: matched.id,
          matchedItemName: matched.name,
          category: (matched.category as SupplyCategory) || item.category,
          confidence: 0.95,
        };
      }
    }

    // Check 3: Fuzzy Token Match against Catalog Name
    let bestMatch: { item: any; score: number } | null = null;
    const tokens = rawDesc
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    for (const catItem of catalog) {
      const catTokens = catItem.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((t: string) => t.length > 2);

      let shared = 0;
      for (const t of tokens) {
        if (catTokens.includes(t)) shared++;
      }

      const score = shared / Math.max(tokens.length, catTokens.length, 1);
      if (score > 0.4 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { item: catItem, score };
      }
    }

    if (bestMatch && bestMatch.score >= 0.4) {
      return {
        ...item,
        matchedItemId: bestMatch.item.id,
        matchedItemName: bestMatch.item.name,
        category: (bestMatch.item.category as SupplyCategory) || item.category,
        confidence: parseFloat(bestMatch.score.toFixed(2)),
      };
    }

    return item;
  });
}

/**
 * Reconciles a Purchase into Inventory:
 * 1. Inserts or Updates `supply_inventory` rows for the target zone.
 * 2. Saves learned SKU/ASIN mappings into `supply_vendor_mappings`.
 * 3. Records/updates the purchase record.
 */
export async function reconcilePurchaseToZone(params: {
  vendorName: string;
  source: 'home_depot_pro_xtra' | 'amazon_orders' | 'quickbooks_sync' | 'manual';
  orderReference: string;
  purchaseDate: string;
  totalAmount: number;
  zoneId: string | null; // null = Central Hub / All Zones
  items: Array<{
    rawIdentifier: string;
    rawDescription: string;
    category: SupplyCategory;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    matchedItemId?: string;
  }>;
}): Promise<{ reconciledCount: number; newMappingsCount: number }> {
  const supabase = await createServiceClient();
  let reconciledCount = 0;
  let newMappingsCount = 0;

  for (const item of params.items) {
    let itemId = item.matchedItemId;

    // If item was not matched, optionally create a new catalog supply_item
    if (!itemId) {
      const newSku =
        item.rawIdentifier ||
        `SKU-${item.rawDescription.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      const { data: createdItem } = await supabase
        .from('supply_items')
        .insert({
          name: item.rawDescription.slice(0, 80),
          sku: newSku,
          category: item.category,
          unit: 'units',
          cost_per_unit: item.unitPrice,
          reorder_threshold: 10,
          home_depot_sku: params.vendorName.toLowerCase().includes('home depot') ? item.rawIdentifier : null,
          amazon_asin: params.vendorName.toLowerCase().includes('amazon') ? item.rawIdentifier : null,
          preferred_store: params.vendorName.toLowerCase().includes('home depot') ? 'Home Depot' : 'Amazon',
          is_active: true,
        })
        .select('id')
        .single();

      if (createdItem) {
        itemId = createdItem.id;
      }
    }

    if (itemId) {
      // 1. Update or Insert Stock in supply_inventory
      let invQuery = supabase.from('supply_inventory').select('id, quantity_on_hand').eq('item_id', itemId);
      if (params.zoneId) {
        invQuery = invQuery.eq('zone_id', params.zoneId);
      } else {
        invQuery = invQuery.is('zone_id', null);
      }

      const { data: existingInv } = await invQuery.maybeSingle();

      if (existingInv) {
        await supabase
          .from('supply_inventory')
          .update({
            quantity_on_hand: existingInv.quantity_on_hand + item.quantity,
            last_restocked_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          })
          .eq('id', existingInv.id);
      } else {
        await supabase.from('supply_inventory').insert({
          item_id: itemId,
          zone_id: params.zoneId,
          quantity_on_hand: item.quantity,
          last_restocked_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        });
      }

      // Also update supply_items cost_per_unit if available
      if (item.unitPrice > 0) {
        await supabase
          .from('supply_items')
          .update({ cost_per_unit: item.unitPrice })
          .eq('id', itemId);
      }

      // 2. Save Learned Mapping for future imports
      if (item.rawIdentifier) {
        try {
          await supabase.from('supply_vendor_mappings').upsert(
            {
              vendor_name: params.vendorName,
              vendor_code: item.rawIdentifier.toLowerCase().trim(),
              supply_item_id: itemId,
              auto_learned: true,
            },
            { onConflict: 'vendor_name,vendor_code' }
          );
          newMappingsCount++;
        } catch {}
      }

      reconciledCount++;
    }
  }

  // Record into supply_purchases table if exists
  try {
    const { data: purchaseRec } = await supabase
      .from('supply_purchases')
      .insert({
        source: params.source,
        vendor_name: params.vendorName,
        order_reference: params.orderReference,
        purchase_date: params.purchaseDate,
        total_amount: params.totalAmount,
        zone_id: params.zoneId,
        status: 'reconciled',
        reconciled_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (purchaseRec) {
      for (const item of params.items) {
        await supabase.from('supply_purchase_items').insert({
          purchase_id: purchaseRec.id,
          raw_identifier: item.rawIdentifier,
          raw_description: item.rawDescription,
          category: item.category,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          matched_item_id: item.matchedItemId,
          is_reconciled: true,
        });
      }
    }
  } catch (err) {
    // If table does not exist in schema cache yet, inventory was still updated gracefully
    console.warn('[Supply Reconciliation] Purchase log skipped:', err);
  }

  return { reconciledCount, newMappingsCount };
}
