-- Create a SECURITY DEFINER function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Update ALL admin policies to use this function instead of querying profiles directly
DROP POLICY IF EXISTS "profiles_admin" ON profiles;
CREATE POLICY "profiles_admin" ON profiles FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "zones_admin" ON zones;
CREATE POLICY "zones_admin" ON zones FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "contractors_admin" ON contractors;
CREATE POLICY "contractors_admin" ON contractors FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to contractor_zones" ON contractor_zones;
CREATE POLICY "Admins have full access to contractor_zones" ON contractor_zones FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "jobs_admin" ON jobs;
CREATE POLICY "jobs_admin" ON jobs FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "offers_admin" ON job_offers;
CREATE POLICY "offers_admin" ON job_offers FOR ALL USING (public.is_admin());
