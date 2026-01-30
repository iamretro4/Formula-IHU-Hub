-- =====================================================
-- track_penalties view: runs with non-empty penalties
-- Used by admin/reports for "total penalties" count.
-- Derived from dynamic_event_runs.penalties (no new table).
-- =====================================================

CREATE OR REPLACE VIEW public.track_penalties
WITH (security_invoker = true)
AS
SELECT
  id,
  team_id,
  event_type,
  run_number,
  penalties,
  recorded_at
FROM public.dynamic_event_runs
WHERE penalties IS NOT NULL
  AND penalties != '{}'::jsonb;

COMMENT ON VIEW public.track_penalties IS 'Runs that have at least one penalty (cones, off_course, dsq). Used for admin/reports total penalties count.';

GRANT SELECT ON public.track_penalties TO authenticated;
