-- =====================================================
-- Team uploads: storage bucket, RLS, and table fixes
-- Migration: 016_team_uploads_storage_bucket.sql
-- =====================================================

-- 1. Create storage bucket "team-uploads" (private, path: team_id/document_key/filename)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('team-uploads', 'team-uploads', false, 52428800)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit;

-- 2. Storage RLS: allow authenticated users to upload/read only their team's folder
-- Path format: {team_id}/{document_key}/{filename} -> first segment = team_id

-- INSERT: user can upload only to path starting with their team_id (or admin)
CREATE POLICY "team_uploads_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-uploads'
  AND (
    public.is_admin()
    OR (public.user_team() IS NOT NULL AND (storage.foldername(name))[1] = (public.user_team())::text)
  )
);

-- SELECT: user can read only objects under their team folder (or admin)
CREATE POLICY "team_uploads_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'team-uploads'
  AND (
    public.is_admin()
    OR (public.user_team() IS NOT NULL AND (storage.foldername(name))[1] = (public.user_team())::text)
  )
);

-- UPDATE: needed for upsert overwrite; same rule as insert
CREATE POLICY "team_uploads_storage_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'team-uploads'
  AND (
    public.is_admin()
    OR (public.user_team() IS NOT NULL AND (storage.foldername(name))[1] = (public.user_team())::text)
  )
)
WITH CHECK (
  bucket_id = 'team-uploads'
  AND (
    public.is_admin()
    OR (public.user_team() IS NOT NULL AND (storage.foldername(name))[1] = (public.user_team())::text)
  )
);

-- 3. team_uploads table: one row per (team_id, document_key); allow upsert
-- Remove duplicates first (keep row with latest uploaded_at per team_id, document_key)
DELETE FROM public.team_uploads a
USING public.team_uploads b
WHERE a.team_id = b.team_id
  AND a.document_key = b.document_key
  AND a.uploaded_at < b.uploaded_at;

ALTER TABLE public.team_uploads
ADD CONSTRAINT team_uploads_team_id_document_key_key UNIQUE (team_id, document_key);

-- 4. UPDATE policy on team_uploads so upsert can update existing row
CREATE POLICY "team_uploads_update" ON public.team_uploads FOR UPDATE
USING (
  team_id = public.user_team() OR public.is_admin()
)
WITH CHECK (
  uploaded_by = (SELECT auth.uid()) AND
  (team_id = public.user_team() OR public.is_admin())
);
