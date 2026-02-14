-- Add scheduled_removal_at for 5-year retention of orphaned profiles
-- When auth.users is removed, profile is kept for historical attribution until this timestamp
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduled_removal_at timestamptz;
