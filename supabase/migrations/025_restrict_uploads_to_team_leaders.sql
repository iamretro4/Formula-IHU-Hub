-- =====================================================
-- Restrict file uploads to team leaders and admins only
-- Migration: 025_restrict_uploads_to_team_leaders.sql
-- =====================================================

-- 1. Update team_uploads table INSERT policy
--    Only team leaders (or admins) may insert upload records
DROP POLICY IF EXISTS "team_uploads_insert" ON public.team_uploads;
CREATE POLICY "team_uploads_insert" ON public.team_uploads FOR INSERT
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND (
    public.is_admin()
    OR (public.is_team_leader() AND team_id = public.user_team())
  )
);

-- 2. Update team_uploads table UPDATE policy
--    Only team leaders (or admins) may update upload records
DROP POLICY IF EXISTS "team_uploads_update" ON public.team_uploads;
CREATE POLICY "team_uploads_update" ON public.team_uploads FOR UPDATE
USING (
  public.is_admin()
  OR (public.is_team_leader() AND team_id = public.user_team())
)
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND (
    public.is_admin()
    OR (public.is_team_leader() AND team_id = public.user_team())
  )
);

-- 3. Update storage INSERT policy
--    Only team leaders (or admins) may upload files to the bucket
DROP POLICY IF EXISTS "team_uploads_storage_insert" ON storage.objects;
CREATE POLICY "team_uploads_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-uploads'
  AND (
    public.is_admin()
    OR (
      public.is_team_leader()
      AND public.user_team() IS NOT NULL
      AND (storage.foldername(name))[1] = (public.user_team())::text
    )
  )
);

-- 4. Update storage UPDATE policy (for upsert)
--    Only team leaders (or admins) may overwrite files
DROP POLICY IF EXISTS "team_uploads_storage_update" ON storage.objects;
CREATE POLICY "team_uploads_storage_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'team-uploads'
  AND (
    public.is_admin()
    OR (
      public.is_team_leader()
      AND public.user_team() IS NOT NULL
      AND (storage.foldername(name))[1] = (public.user_team())::text
    )
  )
)
WITH CHECK (
  bucket_id = 'team-uploads'
  AND (
    public.is_admin()
    OR (
      public.is_team_leader()
      AND public.user_team() IS NOT NULL
      AND (storage.foldername(name))[1] = (public.user_team())::text
    )
  )
);

-- NOTE: Storage SELECT policy is unchanged — team members can still
-- download/view files uploaded to their team folder.
