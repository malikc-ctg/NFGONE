-- supabase:disable-transaction
-- 1. Add 'employee' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee';
