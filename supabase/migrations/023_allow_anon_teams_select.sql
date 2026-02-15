-- Allow anonymous (unauthenticated) users to read teams.
-- This is needed because the signup page fetches teams to populate the
-- team-selection dropdown, and the user is not yet authenticated at that point.
-- Without this, the team_id is never saved during registration.

DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT USING (true);
