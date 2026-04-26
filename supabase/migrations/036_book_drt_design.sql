-- Migration: 036_book_drt_design.sql
-- Description: Create a booking for the team DRT for the Engineering Design event.

DO $$
DECLARE
    team_drt_id uuid;
    design_event_id uuid;
BEGIN
    -- 1. Find DRT team
    SELECT id INTO team_drt_id FROM public.teams WHERE code = 'DRT' LIMIT 1;
    
    -- 2. Find Engineering Design event
    SELECT id INTO design_event_id FROM public.judged_events WHERE name = 'Engineering Design' LIMIT 1;

    -- 3. Create booking if both exist
    IF team_drt_id IS NOT NULL AND design_event_id IS NOT NULL THEN
        -- Check if a booking already exists to avoid duplicates
        IF NOT EXISTS (
            SELECT 1 FROM public.judged_event_bookings 
            WHERE event_id = design_event_id AND team_id = team_drt_id
        ) THEN
            INSERT INTO public.judged_event_bookings (event_id, team_id, scheduled_time, status)
            VALUES (design_event_id, team_drt_id, NOW() + INTERVAL '1 day', 'scheduled');
        END IF;
    END IF;
END $$;
