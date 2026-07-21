import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

export async function PATCH(request: Request) {
  try {
    // Auth check
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { file_url } = body;

    if (!file_url) {
        return NextResponse.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Use service client to bypass RLS, but strictly tied to the logged-in user
    const serviceClient = await createServiceClient();

    // First get the current employee notes
    const { data: employee, error: fetchError } = await serviceClient
      .from('employees')
      .select('id, notes')
      .eq('profile_id', user.id)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const existingNotes = employee.notes ? JSON.parse(employee.notes) : {};
    const updatedNotes = {
        ...existingNotes,
        insurance_details: {
            ...existingNotes.insurance_details,
            file_url,
            uploaded_at: new Date().toISOString()
        }
    };

    // Update with the service client
    const { error: updateError } = await serviceClient
      .from('employees')
      .update({ notes: JSON.stringify(updatedNotes) })
      .eq('id', employee.id);

    if (updateError) {
        throw updateError;
    }

    return NextResponse.json({ success: true, notes: updatedNotes });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
