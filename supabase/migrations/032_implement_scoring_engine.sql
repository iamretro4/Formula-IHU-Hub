
-- Scoring Engine for Formula Student Competition
-- Handles separate scoring for EV and CV classes

CREATE OR REPLACE FUNCTION public.calculate_dynamic_results(p_event_type public.dynamic_event_type DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_class public.vehicle_class;
    v_event public.dynamic_event_type;
    _tbest NUMERIC(10,3);
    _tmax NUMERIC(10,3);
    v_multiplier NUMERIC;
    v_base_points NUMERIC;
    v_max_threshold NUMERIC;
    v_is_skidpad BOOLEAN;
BEGIN
    -- Loop through each vehicle class
    FOR v_class IN SELECT unnest(enum_range(NULL::public.vehicle_class)) LOOP
        
        -- Loop through each dynamic event (or the specific one provided)
        FOR v_event IN 
            SELECT unnest(enum_range(NULL::public.dynamic_event_type)) 
            WHERE (p_event_type IS NULL OR unnest(enum_range(NULL::public.dynamic_event_type)) = p_event_type)
        LOOP
            
            -- 1. Find Tbest for this class and event
            -- Tbest is the minimum corrected_time among all completed runs for teams in this class
            SELECT MIN(r.corrected_time)
            INTO _tbest
            FROM dynamic_event_runs r
            JOIN teams t ON r.team_id = t.id
            WHERE r.event_type = v_event
              AND r.status = 'completed'
              AND r.corrected_time > 0
              AND t.vehicle_class = v_class;

            -- If no valid runs, skip this class/event
            IF _tbest IS NULL THEN
                CONTINUE;
            END IF;

            -- 2. Set event-specific parameters (Standard FS Rules)
            v_is_skidpad := FALSE;
            CASE v_event
                WHEN 'acceleration' THEN
                    v_multiplier := 71.5;
                    v_base_points := 3.5;
                    v_max_threshold := 1.5; -- Tmax = 1.5 * Tbest
                WHEN 'skidpad' THEN
                    v_multiplier := 71.5;
                    v_base_points := 3.5;
                    v_max_threshold := 1.25; -- Tmax = 1.25 * Tbest
                    v_is_skidpad := TRUE;
                WHEN 'autocross' THEN
                    v_multiplier := 95.5;
                    v_base_points := 4.5;
                    v_max_threshold := 1.25; -- Tmax = 1.25 * Tbest
                WHEN 'endurance' THEN
                    v_multiplier := 225.0;
                    v_base_points := 25.0;
                    v_max_threshold := 1.33; -- Tmax = 1.33 * Tbest
                ELSE
                    -- Default fallback
                    v_multiplier := 0;
                    v_base_points := 0;
                    v_max_threshold := 1.5;
            END CASE;

            _tmax := _tbest * v_max_threshold;

            -- 3. Calculate points for each team in this class/event
            -- We find each team's own best corrected_time
            WITH team_best_runs AS (
                SELECT 
                    r.team_id,
                    MIN(r.corrected_time) as team_t
                FROM dynamic_event_runs r
                JOIN teams t ON r.team_id = t.id
                WHERE r.event_type = v_event
                  AND r.status = 'completed'
                  AND r.corrected_time > 0
                  AND t.vehicle_class = v_class
                GROUP BY r.team_id
            )
            INSERT INTO dynamic_event_results (
                team_id, 
                event_type, 
                best_time, 
                tmin, 
                tmax, 
                points, 
                status
            )
            SELECT 
                tbr.team_id,
                v_event,
                tbr.team_t,
                _tbest,
                _tmax,
                CASE 
                    WHEN tbr.team_t <= _tbest THEN (v_multiplier + v_base_points) -- Edge case for floating point or Tbest itself
                    WHEN tbr.team_t >= _tmax THEN v_base_points
                    ELSE 
                        CASE 
                            WHEN v_is_skidpad THEN
                                -- Skidpad uses squared times
                                v_multiplier * ((_tmax/tbr.team_t)^2 - 1) / ((_tmax/_tbest)^2 - 1) + v_base_points
                            ELSE
                                -- Linear scoring for others
                                v_multiplier * ((_tmax/tbr.team_t) - 1) / ((_tmax/_tbest) - 1) + v_base_points
                        END
                END,
                'provisional'
            FROM team_best_runs tbr
            ON CONFLICT (team_id, event_type) DO UPDATE SET
                best_time = EXCLUDED.best_time,
                tmin = EXCLUDED.tmin,
                tmax = EXCLUDED.tmax,
                points = EXCLUDED.points,
                status = EXCLUDED.status,
                updated_at = NOW();

        END LOOP;
    END LOOP;
END;
$$;

-- Grant execution to authenticated users (and service role)
GRANT EXECUTE ON FUNCTION public.calculate_dynamic_results(public.dynamic_event_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_dynamic_results(public.dynamic_event_type) TO service_role;
