-- Fix foreign key relationships between inspection tables and user_profiles
-- This allows Postgrest to join these tables directly for inspector names

-- 1. Fix inspection_progress -> user_profiles
ALTER TABLE IF EXISTS public.inspection_progress
  DROP CONSTRAINT IF EXISTS inspection_progress_user_id_fkey,
  ADD CONSTRAINT inspection_progress_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.user_profiles(id) 
    ON DELETE CASCADE;

-- 2. Fix inspection_comments -> user_profiles
ALTER TABLE IF EXISTS public.inspection_comments
  DROP CONSTRAINT IF EXISTS inspection_comments_user_id_fkey,
  ADD CONSTRAINT inspection_comments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.user_profiles(id) 
    ON DELETE CASCADE;

-- 3. (Optional but good for consistency) Fix other tables pointing to auth.users if they need profile joins
ALTER TABLE IF EXISTS public.track_sessions
  DROP CONSTRAINT IF EXISTS track_sessions_marshal_id_fkey,
  ADD CONSTRAINT track_sessions_marshal_id_fkey 
    FOREIGN KEY (marshal_id) 
    REFERENCES public.user_profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.track_incidents
  DROP CONSTRAINT IF EXISTS track_incidents_marshal_id_fkey,
  ADD CONSTRAINT track_incidents_marshal_id_fkey 
    FOREIGN KEY (marshal_id) 
    REFERENCES public.user_profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.team_uploads
  DROP CONSTRAINT IF EXISTS team_uploads_uploaded_by_fkey,
  ADD CONSTRAINT team_uploads_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) 
    REFERENCES public.user_profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_changed_by_fkey,
  ADD CONSTRAINT audit_logs_changed_by_fkey 
    FOREIGN KEY (changed_by) 
    REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;
