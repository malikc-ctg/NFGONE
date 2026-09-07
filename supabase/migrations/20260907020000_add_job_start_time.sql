-- Add start time fields to jobs and leads
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_start_time TEXT DEFAULT '09:00';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_start_time TEXT DEFAULT '09:00';
