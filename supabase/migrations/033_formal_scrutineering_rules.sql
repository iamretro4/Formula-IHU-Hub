-- Migration: 033_formal_scrutineering_rules.sql
-- Description: Enhances inspection types with class-specific prerequisites and formalizes the workflow rules.

-- 1. Add class-specific prerequisite columns
ALTER TABLE public.inspection_types 
ADD COLUMN IF NOT EXISTS ev_prerequisites text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS cv_prerequisites text[] DEFAULT '{}'::text[];

-- 2. Update inspection types with the new rules
-- EV Flow: (Accumulator, Mechanical, Pre-inspection) -> (Accumulator -> Electrical) -> Tilt -> Rain -> Brake
-- CV Flow: (Mechanical, Pre-inspection) -> Tilt -> Noise -> Brake

-- Accumulator (EV only)
UPDATE public.inspection_types 
SET ev_prerequisites = '{}'::text[], 
    cv_prerequisites = NULL,
    duration_minutes = 60
WHERE key = 'accumulator';

-- Mechanical
UPDATE public.inspection_types 
SET ev_prerequisites = '{}'::text[], 
    cv_prerequisites = '{}'::text[],
    duration_minutes = 90
WHERE key = 'mechanical';

-- Pre-Inspection
UPDATE public.inspection_types 
SET ev_prerequisites = '{}'::text[], 
    cv_prerequisites = '{}'::text[],
    duration_minutes = 30
WHERE key = 'pre_inspection';

-- Electrical (EV only)
UPDATE public.inspection_types 
SET ev_prerequisites = '{"accumulator"}'::text[], 
    cv_prerequisites = NULL,
    duration_minutes = 75
WHERE key = 'electrical';

-- Tilt Test
UPDATE public.inspection_types 
SET ev_prerequisites = '{"accumulator", "mechanical", "pre_inspection", "electrical"}'::text[], 
    cv_prerequisites = '{"mechanical", "pre_inspection"}'::text[],
    duration_minutes = 15
WHERE key = 'tilt_test';

-- Noise Test (CV only)
UPDATE public.inspection_types 
SET ev_prerequisites = NULL, 
    cv_prerequisites = '{"tilt_test"}'::text[],
    duration_minutes = 15
WHERE key = 'noise_test';

-- Rain Test (EV only)
UPDATE public.inspection_types 
SET ev_prerequisites = '{"tilt_test"}'::text[], 
    cv_prerequisites = NULL,
    duration_minutes = 15
WHERE key = 'rain_test';

-- Brake Test
UPDATE public.inspection_types 
SET ev_prerequisites = '{"rain_test"}'::text[], 
    cv_prerequisites = '{"noise_test"}'::text[],
    duration_minutes = 20
WHERE key = 'brake_test';
