import { NextResponse } from 'next/server';
import { getQuickBooksStatus } from '@/lib/quickbooks/client';
import { getRecentSyncLogs } from '@/lib/quickbooks/sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getQuickBooksStatus();
    const recentLogs = await getRecentSyncLogs(8);

    return NextResponse.json({
      ...status,
      recentLogs,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
