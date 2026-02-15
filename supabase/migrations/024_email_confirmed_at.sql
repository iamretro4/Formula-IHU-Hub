-- =====================================================
-- Track email confirmation status in user_profiles
-- Migration: 024_email_confirmed_at.sql
-- =====================================================

-- Add email_confirmed_at to user_profiles so admins can see confirmation status
-- without needing to query auth.users directly.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;

COMMENT ON COLUMN public.user_profiles.email_confirmed_at
  IS 'Timestamp when user confirmed their email via the confirmation link.';

-- Backfill from auth.users for any users who already confirmed their email
UPDATE public.user_profiles p
SET email_confirmed_at = u.email_confirmed_at
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_confirmed_at IS NULL;
