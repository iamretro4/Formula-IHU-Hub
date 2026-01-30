-- Delete auth user antonton@ee.duth (and related auth records).
-- public.user_profiles row will be removed by FK CASCADE from auth.users.

DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = 'antonton@ee.duth';
  IF target_id IS NULL THEN
    RAISE NOTICE 'No auth user found with email antonton@ee.duth';
    RETURN;
  END IF;

  DELETE FROM auth.sessions WHERE user_id = target_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_id::text;
  DELETE FROM auth.identities WHERE user_id = target_id;
  DELETE FROM auth.users WHERE id = target_id;

  RAISE NOTICE 'Deleted auth user antonton@ee.duth (id: %)', target_id;
END $$;
