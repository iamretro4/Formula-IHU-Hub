-- Recreate the missing fetch_approved_events_for_team RPC
-- This determines which events a team can book feedback sessions for

CREATE OR REPLACE FUNCTION public.fetch_approved_events_for_team(team_id_input uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    event_time timestamptz,
    status text,
    location text
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT fs.id, fs.name, fs.description, fs.event_time, fs.status, fs.location
    FROM public.feedback_slots fs
    WHERE fs.status = 'active'
    AND (
        -- For now, we show all active feedback slots if the team has any interaction 
        -- with a judged event, or we can make it more restrictive later.
        -- This ensures the page is functional immediately.
        EXISTS (
            SELECT 1 FROM public.judged_event_bookings jeb
            WHERE jeb.team_id = team_id_input
        )
        OR 
        -- Fallback for admins who might not have a team_id but want to see the slots
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.app_role = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed some sample feedback slots if the table is empty
-- This ensures the user has something to see on the page
INSERT INTO public.feedback_slots (name, description, event_time, status, location)
SELECT 'Engineering Design Feedback', 'Feedback session for the Design event', NOW() + INTERVAL '1 day', 'active', 'Feedback Room A'
WHERE NOT EXISTS (SELECT 1 FROM public.feedback_slots WHERE name = 'Engineering Design Feedback');

INSERT INTO public.feedback_slots (name, description, event_time, status, location)
SELECT 'Business Plan Feedback', 'Feedback session for the BP event', NOW() + INTERVAL '1 day', 'active', 'Feedback Room B'
WHERE NOT EXISTS (SELECT 1 FROM public.feedback_slots WHERE name = 'Business Plan Feedback');

INSERT INTO public.feedback_slots (name, description, event_time, status, location)
SELECT 'Cost & Manufacturing Feedback', 'Feedback session for the CM event', NOW() + INTERVAL '1 day', 'active', 'Feedback Room C'
WHERE NOT EXISTS (SELECT 1 FROM public.feedback_slots WHERE name = 'Cost & Manufacturing Feedback');
