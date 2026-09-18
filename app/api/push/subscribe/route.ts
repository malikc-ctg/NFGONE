import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/push/subscribe
 * Saves the employee's Web Push subscription into the notes JSON field.
 * Body: { subscription: PushSubscription }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const serviceClient = await createServiceClient();

    // Find the employee by profile_id
    const { data: employee, error: empError } = await serviceClient
      .from('employees')
      .select('id, notes')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Parse existing notes and merge push_subscription into it
    let notes: Record<string, any> = {};
    try {
      notes = typeof employee.notes === 'string'
        ? JSON.parse(employee.notes)
        : (employee.notes || {});
    } catch {
      notes = {};
    }

    notes.push_subscription = subscription;

    const { error: updateError } = await serviceClient
      .from('employees')
      .update({
        notes: JSON.stringify(notes),
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee.id);

    if (updateError) {
      console.error('Failed to save push subscription:', updateError);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Push subscribe error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Removes the employee's push subscription from notes.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();

    // Fetch current notes
    const { data: employee } = await serviceClient
      .from('employees')
      .select('id, notes')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (employee) {
      let notes: Record<string, any> = {};
      try {
        notes = typeof employee.notes === 'string'
          ? JSON.parse(employee.notes)
          : (employee.notes || {});
      } catch {
        notes = {};
      }

      delete notes.push_subscription;

      await serviceClient
        .from('employees')
        .update({ notes: JSON.stringify(notes) })
        .eq('id', employee.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
