-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins have full access to storage" ON storage.objects;
CREATE POLICY "Admins have full access to storage" ON storage.objects FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Authenticated users can insert documents
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON storage.objects;
CREATE POLICY "Authenticated users can insert documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.role() = 'authenticated'
);

-- Authenticated users can select documents
DROP POLICY IF EXISTS "Authenticated users can select documents" ON storage.objects;
CREATE POLICY "Authenticated users can select documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND auth.role() = 'authenticated'
);
