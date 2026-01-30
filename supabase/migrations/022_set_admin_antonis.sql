-- Set antonis.ntwnas@gmail.com as admin (idempotent).
UPDATE public.user_profiles
SET app_role = 'admin', login_approved = true
WHERE email = 'antonis.ntwnas@gmail.com';
