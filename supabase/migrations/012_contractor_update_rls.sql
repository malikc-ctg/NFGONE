-- Migration: 012 Contractor Update RLS
-- Allows contractors to update their own record (necessary for onboarding to change status to 'active' and save HQ coordinates)

DROP POLICY IF EXISTS "contractors_update_own" ON contractors;
CREATE POLICY "contractors_update_own" ON contractors 
FOR UPDATE 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());
