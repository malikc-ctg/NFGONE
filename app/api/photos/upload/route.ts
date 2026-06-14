import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const jobId = formData.get('job_id') as string | null;
    const photoType = formData.get('photo_type') as string | null;
    const caption = formData.get('caption') as string | null;

    if (!file || !jobId || !photoType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify job belongs to contractor
    const { data: job } = await supabase
      .from('jobs')
      .select('assigned_contractor_id')
      .eq('id', jobId)
      .single();

    if (!job || job.assigned_contractor_id !== contractor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceClient = await createServiceClient();

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${jobId}/${photoType}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceClient
      .storage
      .from('job_photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = serviceClient
      .storage
      .from('job_photos')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Insert into job_photos table
    const { data: photoRecord, error: dbError } = await serviceClient
      .from('job_photos')
      .insert({
        job_id: jobId,
        contractor_id: contractor.id,
        photo_type: photoType,
        file_url: publicUrl,
        caption: caption || '',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, photo: photoRecord });

  } catch (err: unknown) {
    console.error('POST /api/photos/upload error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
