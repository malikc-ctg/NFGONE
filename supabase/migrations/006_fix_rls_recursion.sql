-- Migration: 006 Fix RLS Recursion
-- Resolve infinite recursion in profiles and other tables using admin checks

-- 1. Fix profiles table recursion
-- The original policy was: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- This is recursive because SELECTing from profiles triggers the policy itself.
-- Using a subquery that targets the user's own profile (which is covered by the 'profiles_own' policy) 
-- is a common way to break the recursion.

DROP POLICY IF EXISTS "profiles_admin" ON profiles;
CREATE POLICY "profiles_admin" ON profiles FOR ALL USING (
  (SELECT (role = 'admin') FROM profiles WHERE id = auth.uid())
);

-- 2. Fix other tables that use the same pattern to be more robust
-- Although the profiles fix might be enough, it's safer to use the same pattern everywhere.

DROP POLICY IF EXISTS "zones_admin" ON zones;
CREATE POLICY "zones_admin" ON zones FOR ALL USING (
  (SELECT (role = 'admin') FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "contractors_admin" ON contractors;
CREATE POLICY "contractors_admin" ON contractors FOR ALL USING (
  (SELECT (role = 'admin') FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins have full access to contractor_zones" ON contractor_zones;
CREATE POLICY "Admins have full access to contractor_zones" ON contractor_zones FOR ALL USING (
  (SELECT (role = 'admin') FROM profiles WHERE id = auth.uid())
);

-- Apply similar fixes to other major tables if needed
DROP POLICY IF EXISTS "jobs_admin" ON jobs;
CREATE POLICY "jobs_admin" ON jobs FOR ALL USING (
  (SELECT (role = 'admin') FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "offers_admin" ON job_offers;
CREATE POLICY "offers_admin" ON job_offers FOR ALL USING (
  (SELECT (role = 'admin') FROM profiles WHERE id = auth.uid())
);
