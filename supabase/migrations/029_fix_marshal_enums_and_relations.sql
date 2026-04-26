-- Update incident_type enum to include 'Safety'
-- Note: ALTER TYPE ... ADD VALUE cannot be executed in a transaction block in some Postgres versions.
-- However, in Supabase/Postgres 12+, it's generally fine if it's the only thing or handled correctly.
ALTER TYPE public.incident_type ADD VALUE IF NOT EXISTS 'Safety';

-- Ensure explicit foreign keys for inspection tables to help PostgREST relationship resolution
-- 1. inspection_progress
ALTER TABLE public.inspection_progress
DROP CONSTRAINT IF EXISTS inspection_progress_user_id_fkey,
ADD CONSTRAINT inspection_progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) 
ON DELETE SET NULL;

-- 2. inspection_comments
ALTER TABLE public.inspection_comments
DROP CONSTRAINT IF EXISTS inspection_comments_user_id_fkey,
ADD CONSTRAINT inspection_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) 
ON DELETE SET NULL;

-- Notify PostgREST to reload schema (Supabase does this automatically usually, but a comment helps track)
COMMENT ON TABLE public.inspection_progress IS 'Tracked inspection items with explicit user_profiles link';
