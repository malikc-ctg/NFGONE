import { createServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { sendGenericPush } from '@/lib/web-push';

/**
 * POST /api/push/send
 * Admin-only endpoint to send a push notification to a specific employee.
 * Body: { employee_id: string, title: string, body: string, url?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const { employee_id, title, body, url } = await request.json();

    if (!employee_id || !title || !body) {
      return NextResponse.json(
        { error: 'Missing employee_id, title, or body' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, full_name, notes')
      .eq('id', employee_id)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Extract push_subscription from notes JSON
    let notes: Record<string, any> = {};
    try {
      notes = typeof employee.notes === 'string'
        ? JSON.parse(employee.notes)
        : (employee.notes || {});
    } catch {
      notes = {};
    }

    const pushSubscription = notes.push_subscription;

    if (!pushSubscription) {
      return NextResponse.json(
        { error: `${employee.full_name} has not enabled push notifications yet. They need to open the employee portal and tap "Enable Notifications".` },
        { status: 422 }
      );
    }

    const success = await sendGenericPush(pushSubscription, title, body, url);

    if (!success) {
      // Subscription might be expired, clear it
      delete notes.push_subscription;
      await supabase
        .from('employees')
        .update({ notes: JSON.stringify(notes) })
        .eq('id', employee_id);

      return NextResponse.json(
        { error: 'Push notification failed. Subscription may have expired. Ask the employee to re-enable notifications.' },
        { status: 410 }
      );
    }

    // Log the notification
    await supabase.from('notifications').insert({
      recipient_email: employee.full_name,
      notification_type: 'push_manual',
      channel: 'web_push',
      message: `${title}: ${body}`,
      job_id: null,
      sent_at: new Date().toISOString(),
      delivered: true,
    });

    return NextResponse.json({ success: true, employee: employee.full_name });
  } catch (err: unknown) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
