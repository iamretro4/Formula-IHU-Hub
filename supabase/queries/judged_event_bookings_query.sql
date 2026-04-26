-- Query: Get Bookings for Judged Events along with their Grading Categories
SELECT 
    b.id AS booking_id,
    t.name AS team_name,
    t.vehicle_class,
    e.name AS event_name,
    e.location AS event_location,
    b.scheduled_time,
    b.status AS booking_status,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'criterion_id', c.id,
                'title', c.title,
                'max_score', c.max_score
            ) ORDER BY c.criterion_index
        )
        FROM public.judged_event_criteria c
        WHERE c.event_id = e.id
    ) AS grading_categories
FROM public.judged_event_bookings b
JOIN public.judged_events e ON b.event_id = e.id
JOIN public.teams t ON b.team_id = t.id
ORDER BY b.scheduled_time ASC;
