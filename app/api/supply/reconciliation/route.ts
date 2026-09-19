import { NextRequest, NextResponse } from 'next/server';
import {
  parseHomeDepotProXtraCSV,
  parseAmazonOrderHistoryCSV,
  matchPurchaseItems,
} from '@/lib/supply-reconciliation';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServiceClient();
    let purchases: any[] = [];

    try {
      const { data } = await supabase
        .from('supply_purchases')
        .select('*, items:supply_purchase_items(*), zone:zones(name)')
        .order('purchase_date', { ascending: false })
        .limit(25);
      if (data) purchases = data;
    } catch {}

    return NextResponse.json({ purchases });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csvContent, vendorHint } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ error: 'csvContent string required' }, { status: 400 });
    }

    const lower = csvContent.toLowerCase();
    const isAmazon =
      vendorHint === 'amazon' ||
      lower.includes('asin') ||
      lower.includes('order id') ||
      lower.includes('amazon');

    let parsedPurchase;
    if (isAmazon) {
      parsedPurchase = parseAmazonOrderHistoryCSV(csvContent);
    } else {
      parsedPurchase = parseHomeDepotProXtraCSV(csvContent);
    }

    // Auto-match items against catalog & learned dictionary
    const matchedItems = await matchPurchaseItems(
      parsedPurchase.vendorName,
      parsedPurchase.items
    );

    return NextResponse.json({
      ...parsedPurchase,
      items: matchedItems,
    });
  } catch (err: unknown) {
    console.error('Failed to parse purchase CSV:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
