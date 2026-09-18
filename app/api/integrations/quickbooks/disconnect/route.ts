import { NextRequest, NextResponse } from 'next/server';
import { disconnectQuickBooks } from '@/lib/quickbooks/client';

export async function POST() {
  try {
    const result = await disconnectQuickBooks();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await disconnectQuickBooks();
    return NextResponse.redirect(
      new URL('/sobadmin/settings?tab=quickbooks&status=disconnected', request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL('/sobadmin/settings?tab=quickbooks&error=disconnect_failed', request.url)
    );
  }
}
