-- Migration: 035_judged_events_seed.sql
-- Description: Seed data for Judged Events, their criteria (grading categories), and sample bookings.

DO $$
DECLARE
    design_event_id uuid;
    cost_event_id uuid;
    business_event_id uuid;
    sample_team_id uuid;
BEGIN
    -- 1. Insert Judged Events
    INSERT INTO public.judged_events (name, description, location, status)
    VALUES 
        ('Engineering Design', 'Evaluation of the engineering design of the vehicle.', 'Design Bay', 'scheduled')
    RETURNING id INTO design_event_id;

    INSERT INTO public.judged_events (name, description, location, status)
    VALUES 
        ('Cost and Manufacturing', 'Evaluation of the cost report and manufacturing process.', 'Cost Bay', 'scheduled')
    RETURNING id INTO cost_event_id;

    INSERT INTO public.judged_events (name, description, location, status)
    VALUES 
        ('Business Plan Presentation', 'Evaluation of the business logic and presentation.', 'Presentation Room', 'scheduled')
    RETURNING id INTO business_event_id;

    -- 2. Insert Grading Categories (Criteria) for Engineering Design
    INSERT INTO public.judged_event_criteria (event_id, criterion_index, title, max_score) VALUES
        (design_event_id, 1, 'Suspension', 25),
        (design_event_id, 2, 'Frame / Body / Aero', 25),
        (design_event_id, 3, 'Tractive System', 25),
        (design_event_id, 4, 'Powertrain', 25),
        (design_event_id, 5, 'Cockpit / Controls / Brakes / Safety', 25),
        (design_event_id, 6, 'Systems Management / Integration', 25);

    -- 3. Insert Grading Categories (Criteria) for Cost and Manufacturing
    INSERT INTO public.judged_event_criteria (event_id, criterion_index, title, max_score) VALUES
        (cost_event_id, 1, 'Format and Accuracy of Documents', 20),
        (cost_event_id, 2, 'Knowledge of Manufacturing Processes', 40),
        (cost_event_id, 3, 'Real Case Situation', 40);

    -- 4. Insert Grading Categories (Criteria) for Business Plan Presentation
    INSERT INTO public.judged_event_criteria (event_id, criterion_index, title, max_score) VALUES
        (business_event_id, 1, 'Content', 20),
        (business_event_id, 2, 'Organization', 15),
        (business_event_id, 3, 'Delivery and Visual Aids', 20),
        (business_event_id, 4, 'Questions and Answers', 20);

    -- 5. Insert Sample Bookings (assuming at least one team exists)
    SELECT id INTO sample_team_id FROM public.teams LIMIT 1;

    IF sample_team_id IS NOT NULL THEN
        -- Booking for Engineering Design
        INSERT INTO public.judged_event_bookings (event_id, team_id, scheduled_time, status)
        VALUES (design_event_id, sample_team_id, NOW() + INTERVAL '1 day', 'scheduled');

        -- Booking for Cost and Manufacturing
        INSERT INTO public.judged_event_bookings (event_id, team_id, scheduled_time, status)
        VALUES (cost_event_id, sample_team_id, NOW() + INTERVAL '1 day 2 hours', 'scheduled');

        -- Booking for Business Plan Presentation
        INSERT INTO public.judged_event_bookings (event_id, team_id, scheduled_time, status)
        VALUES (business_event_id, sample_team_id, NOW() + INTERVAL '2 days', 'scheduled');
    END IF;

END $$;
