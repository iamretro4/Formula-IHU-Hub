-- =====================================================
-- Clean auth.users so emails from deleted profiles
-- can be used for signup again.
-- Run this after 018_reset_2026_competition or anytime
-- you deleted user_profiles but auth users remained.
-- =====================================================

-- Supabase Auth keeps users in auth.users. Deleting only from
-- public.user_profiles leaves the email "taken" for signUp().
-- This removes auth users except those in the preserved-emails list.

DO $$
BEGIN
  -- Delete in FK-safe order: sessions, refresh_tokens, identities, then users.
  -- Preserved: admin + huseyinkocamis@std.iyte.edu.tr (and any other emails you add).
  DELETE FROM auth.sessions
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email NOT IN (
      'antonis.ntwnas@gmail.com',
      'huseyinkocamis@std.iyte.edu.tr'
    )
  );

  -- auth.refresh_tokens.user_id may be varchar; use subquery and cast to avoid type error
  DELETE FROM auth.refresh_tokens
  WHERE user_id IN (
    SELECT id::text FROM auth.users
    WHERE email NOT IN (
      'antonis.ntwnas@gmail.com',
      'huseyinkocamis@std.iyte.edu.tr'
    )
  );

  DELETE FROM auth.identities
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email NOT IN (
      'antonis.ntwnas@gmail.com',
      'huseyinkocamis@std.iyte.edu.tr'
    )
  );

  DELETE FROM auth.users
  WHERE email NOT IN (
    'antonis.ntwnas@gmail.com',
    'huseyinkocamis@std.iyte.edu.tr'
  );
END $$;
