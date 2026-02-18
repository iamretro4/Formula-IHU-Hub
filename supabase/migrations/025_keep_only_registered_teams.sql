-- =====================================================
-- Keep only the 17 currently registered teams.
-- Remove all other teams and their associated data.
-- Migration: 025_keep_only_registered_teams.sql
-- =====================================================

DO $$
DECLARE
  kept_codes text[] := ARRAY[
    'IZTECH',   -- ZTECH / IZTECH RACING
    'TUIASI',   -- EVR TUIASI / T.U.IASI Racing
    'MES',      -- MES Racing
    'FRTUCY',   -- FRTUCY
    'FSTUC',    -- FS TUC / Formula Students Technical University of Crete
    'CRT',      -- Centaurus / Centaurus Racing Team
    'ENP',      -- ENP Racing / ENP RACING TEAM
    'MR',       -- Marseille / Marseille Racing
    'PERSEUS',  -- Perseus / Perseus Racing
    'FESB',     -- FESB / FESB Racing
    'SPARK',    -- Team Spark
    'TRFST',    -- Trakya / Trakya Racing Formula Student Team
    'TUSOF',    -- TU SOFIA / TU-Sofia Racing
    'PELOPS',   -- Pelops / Pelops Racing Team
    'DRT',      -- DRT / Democritus Racing Team
    'PRT',      -- Poseidon / Poseidon Racing Team
    'FUF',      -- FUF / fufracingteam
    'DAEDALUS', -- Daedalus / Daedalus Racing Team
    'GLR'       -- Green Lion Racing
  ];
BEGIN
  -- 1. Unlink user profiles that belong to teams being removed
  UPDATE public.user_profiles
  SET team_id = NULL
  WHERE team_id IN (
    SELECT id FROM public.teams WHERE code != ALL(kept_codes)
  );

  -- 2. Delete from child tables referencing teams being removed
  DELETE FROM public.judge_score_audit
  WHERE score_id IN (
    SELECT jes.id FROM public.judged_event_scores jes
    JOIN public.judged_event_bookings jeb ON jes.booking_id = jeb.id
    WHERE jeb.team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes))
  );

  DELETE FROM public.judged_event_scores
  WHERE booking_id IN (
    SELECT id FROM public.judged_event_bookings
    WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes))
  );

  DELETE FROM public.judged_event_bookings
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  DELETE FROM public.feedback_bookings
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  -- inspection_comments and inspection_progress link to teams via bookings
  DELETE FROM public.inspection_comments
  WHERE booking_id IN (
    SELECT id FROM public.bookings
    WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes))
  );

  DELETE FROM public.inspection_progress
  WHERE booking_id IN (
    SELECT id FROM public.bookings
    WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes))
  );

  DELETE FROM public.inspection_results
  WHERE booking_id IN (
    SELECT id FROM public.bookings
    WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes))
  );

  DELETE FROM public.bookings
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  DELETE FROM public.track_incidents
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  DELETE FROM public.track_activity_log
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  DELETE FROM public.track_sessions
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  DELETE FROM public.dynamic_event_runs
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  DELETE FROM public.dynamic_event_results
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  DELETE FROM public.efficiency_results
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  DELETE FROM public.team_uploads
  WHERE team_id IN (SELECT id FROM public.teams WHERE code != ALL(kept_codes));

  -- 3. Delete the teams themselves
  DELETE FROM public.teams
  WHERE code != ALL(kept_codes);
END $$;
