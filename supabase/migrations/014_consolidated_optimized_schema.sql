-- =====================================================
-- Formula IHU Hub - Consolidated & Optimized Schema
-- Migration: 014_consolidated_optimized_schema.sql
-- =====================================================
-- This migration consolidates all previous migrations into a single,
-- optimized schema that matches the current database state.
-- It removes unused tables, fixes inconsistencies, and optimizes performance.
-- =====================================================

-- =====================================================
-- CLEANUP: Remove unused tables and objects
-- =====================================================

-- Drop unused checklist_checks table (replaced by inspection_progress)
DROP TABLE IF EXISTS checklist_checks CASCADE;

-- Drop unused enum types if they exist (document management not used)
DROP TYPE IF EXISTS document_event_type CASCADE;
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;

-- Drop duplicate indexes (performance optimization)
DROP INDEX IF EXISTS idx_inspection_comments_booking;
DROP INDEX IF EXISTS idx_inspection_comments_item;
DROP INDEX IF EXISTS idx_inspection_comments_user;
DROP INDEX IF EXISTS idx_inspection_progress_booking;
DROP INDEX IF EXISTS idx_track_activity_log_team;

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User roles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'admin', 'scrutineer', 'team_leader', 'inspection_responsible',
        'team_member', 'design_judge_software', 'design_judge_mechanical',
        'design_judge_electronics', 'design_judge_overall', 'bp_judge',
        'cm_judge', 'track_marshal', 'viewer'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Vehicle classifications
DO $$ BEGIN
    CREATE TYPE public.vehicle_class AS ENUM ('EV', 'CV');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Inspection types
DO $$ BEGIN
    CREATE TYPE public.inspection_type_enum AS ENUM (
        'pre_inspection', 'mechanical', 'accumulator', 'electrical',
        'noise_test', 'brake_test', 'tilt_test', 'rain_test'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Booking and inspection statuses
DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM (
        'upcoming', 'ongoing', 'completed', 'cancelled', 'no_show'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.result_status AS ENUM (
        'ongoing', 'passed', 'failed', 'conditional_pass', 'provisional'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Track marshal enums
DO $$ BEGIN
    CREATE TYPE public.session_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.incident_type AS ENUM ('DOO', 'OOC', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.severity_level AS ENUM ('minor', 'major', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Dynamic events
DO $$ BEGIN
    CREATE TYPE public.dynamic_event_type AS ENUM (
        'acceleration', 'skidpad', 'autocross', 'endurance'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.run_status AS ENUM ('completed', 'dsq', 'dnf', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- System notifications
DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM (
        'info', 'success', 'warning', 'error', 'critical'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Penalties
DO $$ BEGIN
    CREATE TYPE public.penalty_type AS ENUM (
        'time_penalty', 'points_deduction', 'dsq'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.penalty_unit AS ENUM ('seconds', 'points', 'percentage');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Score status for judged events
DO $$ BEGIN
    CREATE TYPE public.score_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text UNIQUE NOT NULL,
    code text UNIQUE NOT NULL,
    vehicle_class public.vehicle_class NOT NULL,
    university text NOT NULL,
    drivers jsonb DEFAULT '[]'::jsonb,
    vehicle_number integer UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    father_name text NOT NULL,
    phone text NOT NULL,
    emergency_contact text NOT NULL,
    campsite_staying boolean NOT NULL DEFAULT false,
    ehic_number text, -- Nullable (as per current DB)
    team_id uuid REFERENCES teams(id),
    app_role public.user_role NOT NULL DEFAULT 'viewer',
    profile_completed boolean DEFAULT false,
    team_lead boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- SCRUTINEERING SYSTEM
-- =====================================================

-- Inspection types configuration
CREATE TABLE IF NOT EXISTS inspection_types (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key public.inspection_type_enum UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    duration integer NOT NULL DEFAULT 120, -- Alias for duration_minutes
    concurrent_slots integer NOT NULL DEFAULT 1,
    slot_count integer NOT NULL DEFAULT 1, -- Alias for concurrent_slots
    sort_order integer NOT NULL,
    prerequisites text[] DEFAULT '{}'::text[],
    requirements text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Inspection bookings
CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES teams(id) NOT NULL,
    inspection_type_id uuid REFERENCES inspection_types(id) NOT NULL,
    date date NOT NULL,
    start_time text NOT NULL, -- Keep as text (used as string in code)
    end_time text NOT NULL, -- Keep as text (used as string in code)
    resource_index integer NOT NULL DEFAULT 1,
    status public.booking_status NOT NULL DEFAULT 'upcoming',
    is_rescrutineering boolean DEFAULT false,
    priority_level integer DEFAULT 0,
    notes text,
    created_by uuid REFERENCES auth.users(id) NOT NULL,
    inspection_status text, -- Additional status field
    assigned_scrutineer_id uuid REFERENCES auth.users(id),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    -- Ensure no double bookings
    UNIQUE(inspection_type_id, date, start_time, resource_index)
);

-- Inspection results
CREATE TABLE IF NOT EXISTS inspection_results (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id uuid REFERENCES bookings(id) NOT NULL UNIQUE,
    status public.result_status NOT NULL DEFAULT 'ongoing',
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    scrutineer_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
    overall_notes text,
    pass_conditions text,
    failure_reasons text,
    next_steps text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Checklist templates
CREATE TABLE IF NOT EXISTS checklist_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_type_id uuid REFERENCES inspection_types(id) NOT NULL,
    section text NOT NULL,
    item_code text NOT NULL,
    description text NOT NULL,
    required boolean DEFAULT true,
    order_index integer NOT NULL,
    item_index integer NOT NULL DEFAULT 0, -- Alias for order_index
    parent_item_id uuid REFERENCES checklist_templates(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(inspection_type_id, item_code)
);

-- Inspection progress (replaces checklist_checks)
CREATE TABLE IF NOT EXISTS inspection_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES bookings(id) NOT NULL,
    item_id uuid REFERENCES checklist_templates(id) NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    checked_at timestamptz NOT NULL DEFAULT now(),
    status text CHECK (status IN ('passed', 'failed')),
    comment text,
    locked boolean DEFAULT false,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(booking_id, item_id)
);

-- Inspection comments
CREATE TABLE IF NOT EXISTS inspection_comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id uuid REFERENCES bookings(id) NOT NULL,
    item_id uuid REFERENCES checklist_templates(id) NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    comment text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TRACK MARSHAL SYSTEM
-- =====================================================

-- Track sessions
CREATE TABLE IF NOT EXISTS track_sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES teams(id) NOT NULL,
    marshal_id uuid REFERENCES auth.users(id) NOT NULL,
    sector text NOT NULL,
    entry_time timestamptz DEFAULT now(),
    exit_time timestamptz,
    status public.session_status DEFAULT 'active',
    notes text,
    weather_conditions text,
    track_conditions text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Track incidents
CREATE TABLE IF NOT EXISTS track_incidents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES teams(id) NOT NULL,
    marshal_id uuid REFERENCES auth.users(id) NOT NULL,
    session_id uuid REFERENCES track_sessions(id),
    sector text NOT NULL,
    incident_type public.incident_type NOT NULL,
    severity public.severity_level DEFAULT 'minor',
    description text NOT NULL,
    action_taken text,
    occurred_at timestamptz DEFAULT now(),
    coordinates point,
    weather_impact boolean DEFAULT false,
    run_number integer,
    created_at timestamptz DEFAULT now()
);

-- Track activity log
CREATE TABLE IF NOT EXISTS track_activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES teams(id),
    event text NOT NULL,
    sector text NOT NULL,
    action text NOT NULL,
    timestamp timestamptz DEFAULT now(),
    marshal_id uuid REFERENCES auth.users(id)
);

-- =====================================================
-- DYNAMIC EVENTS SCORING
-- =====================================================

-- Dynamic event runs
CREATE TABLE IF NOT EXISTS dynamic_event_runs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES teams(id) NOT NULL,
    driver_id uuid REFERENCES auth.users(id),
    event_type public.dynamic_event_type NOT NULL,
    run_number integer NOT NULL,
    raw_time numeric(10,3),
    penalties jsonb DEFAULT '{}'::jsonb,
    corrected_time numeric(10,3),
    status public.run_status DEFAULT 'completed',
    recorded_by uuid REFERENCES auth.users(id) NOT NULL,
    recorded_at timestamptz DEFAULT now(),
    notes text,
    weather_conditions text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(team_id, event_type, run_number)
);

-- Dynamic event results
CREATE TABLE IF NOT EXISTS dynamic_event_results (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES teams(id) NOT NULL,
    event_type public.dynamic_event_type NOT NULL,
    best_time numeric(10,3),
    points numeric(5,2),
    position integer,
    class_position integer,
    status public.result_status DEFAULT 'provisional',
    tmin numeric(10,3),
    tmax numeric(10,3),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(team_id, event_type)
);

-- Efficiency results
CREATE TABLE IF NOT EXISTS efficiency_results (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES teams(id) NOT NULL,
    endurance_time numeric(10,3),
    energy_used numeric(10,3),
    efficiency_factor numeric(10,6),
    efficiency_points numeric(5,2),
    combined_endurance_efficiency_points numeric(5,2),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(team_id)
);

-- Penalty rules
CREATE TABLE IF NOT EXISTS penalty_rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type public.dynamic_event_type NOT NULL,
    rule_type public.penalty_type NOT NULL,
    condition jsonb NOT NULL,
    penalty_value numeric(10,3) NOT NULL,
    penalty_unit public.penalty_unit NOT NULL,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- JUDGED EVENTS SYSTEM
-- =====================================================

-- Judged events
CREATE TABLE IF NOT EXISTS judged_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    event_time timestamptz,
    status text,
    location text
);

-- Judged event criteria
CREATE TABLE IF NOT EXISTS judged_event_criteria (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES judged_events(id),
    criterion_index integer NOT NULL,
    title text NOT NULL,
    max_score integer NOT NULL DEFAULT 10
);

-- Judged event bookings
CREATE TABLE IF NOT EXISTS judged_event_bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES judged_events(id),
    team_id uuid REFERENCES teams(id),
    scheduled_time timestamptz,
    status text
);

-- Judged event scores
CREATE TABLE IF NOT EXISTS judged_event_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES judged_event_bookings(id),
    criterion_id uuid REFERENCES judged_event_criteria(id),
    judge_id uuid REFERENCES user_profiles(id),
    score integer,
    comment text,
    submitted_at timestamptz DEFAULT now(),
    status public.score_status NOT NULL DEFAULT 'pending'
);

-- Judge score audit
CREATE TABLE IF NOT EXISTS judge_score_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    old_score integer,
    old_comment text,
    new_score integer,
    new_comment text,
    old_judge_id uuid,
    new_judge_id uuid,
    changed_at timestamp DEFAULT now()
);

-- =====================================================
-- FEEDBACK SYSTEM
-- =====================================================

-- Feedback slots
CREATE TABLE IF NOT EXISTS feedback_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    event_time timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'scheduled',
    location text NOT NULL
);

-- Feedback bookings
CREATE TABLE IF NOT EXISTS feedback_bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES teams(id) NOT NULL,
    slot_id uuid REFERENCES feedback_slots(id) NOT NULL,
    requested_by uuid REFERENCES auth.users(id) NOT NULL,
    date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    location text NOT NULL,
    notes text,
    status text NOT NULL DEFAULT 'pending',
    approved_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Feedback judge assignments
CREATE TABLE IF NOT EXISTS feedback_judge_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES feedback_bookings(id) NOT NULL,
    judge_id uuid REFERENCES auth.users(id) NOT NULL,
    assigned_at timestamptz DEFAULT now()
);

-- =====================================================
-- NOTIFICATIONS & UPLOADS
-- =====================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL DEFAULT 'info',
    title text NOT NULL,
    message text NOT NULL,
    link text,
    read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz
);

-- Team uploads
CREATE TABLE IF NOT EXISTS team_uploads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES teams(id) NOT NULL,
    uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
    document_key text NOT NULL,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    uploaded_at timestamptz DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by uuid REFERENCES auth.users(id),
    changed_at timestamptz DEFAULT now(),
    ip_address inet,
    user_agent text
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_code ON teams(code);
CREATE INDEX IF NOT EXISTS idx_teams_vehicle_class ON teams(vehicle_class);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_team ON user_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(app_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_team_role ON user_profiles(team_id, app_role) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Inspection types indexes
CREATE INDEX IF NOT EXISTS idx_inspection_types_key ON inspection_types(key);
CREATE INDEX IF NOT EXISTS idx_inspection_types_active ON inspection_types(active) WHERE active = true;

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_team_date ON bookings(team_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_inspection_type_date ON bookings(inspection_type_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_scrutineer ON bookings(assigned_scrutineer_id) WHERE assigned_scrutineer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status_priority ON bookings(status, priority_level DESC, start_time);

-- Inspection results indexes
CREATE INDEX IF NOT EXISTS idx_inspection_results_booking ON inspection_results(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_status ON inspection_results(status);
CREATE INDEX IF NOT EXISTS idx_inspection_results_started_at ON inspection_results(started_at);

-- Checklist templates indexes
CREATE INDEX IF NOT EXISTS idx_checklist_templates_inspection_type ON checklist_templates(inspection_type_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_section_order ON checklist_templates(inspection_type_id, section, order_index);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_required ON checklist_templates(inspection_type_id, required, order_index) WHERE required = true;

-- Inspection progress indexes
CREATE INDEX IF NOT EXISTS idx_inspection_progress_booking_id ON inspection_progress(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspection_progress_item ON inspection_progress(item_id);
CREATE INDEX IF NOT EXISTS idx_inspection_progress_user ON inspection_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_progress_checked_at ON inspection_progress(checked_at) WHERE checked_at IS NOT NULL;

-- Inspection comments indexes
CREATE INDEX IF NOT EXISTS idx_inspection_comments_booking_id ON inspection_comments(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspection_comments_item_id ON inspection_comments(item_id);
CREATE INDEX IF NOT EXISTS idx_inspection_comments_user_id ON inspection_comments(user_id);

-- Track sessions indexes
CREATE INDEX IF NOT EXISTS idx_track_sessions_team ON track_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_track_sessions_marshal ON track_sessions(marshal_id);
CREATE INDEX IF NOT EXISTS idx_track_sessions_team_entry ON track_sessions(team_id, entry_time);
CREATE INDEX IF NOT EXISTS idx_track_sessions_status ON track_sessions(status) WHERE status = 'active';

-- Track incidents indexes
CREATE INDEX IF NOT EXISTS idx_track_incidents_team ON track_incidents(team_id);
CREATE INDEX IF NOT EXISTS idx_track_incidents_occurred_at ON track_incidents(occurred_at);
CREATE INDEX IF NOT EXISTS idx_track_incidents_team_occurred ON track_incidents(team_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_track_incidents_type_severity ON track_incidents(incident_type, severity);

-- Track activity log indexes
CREATE INDEX IF NOT EXISTS idx_track_activity_log_team_id ON track_activity_log(team_id);
CREATE INDEX IF NOT EXISTS idx_track_activity_log_timestamp ON track_activity_log(timestamp DESC);

-- Dynamic event runs indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_runs_team_event ON dynamic_event_runs(team_id, event_type);
CREATE INDEX IF NOT EXISTS idx_dynamic_runs_team_event_run ON dynamic_event_runs(team_id, event_type, run_number);
CREATE INDEX IF NOT EXISTS idx_dynamic_runs_event_time ON dynamic_event_runs(event_type, corrected_time) WHERE corrected_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dynamic_runs_status ON dynamic_event_runs(status);

-- Dynamic event results indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_results_team_event ON dynamic_event_results(team_id, event_type);
CREATE INDEX IF NOT EXISTS idx_dynamic_results_event_points ON dynamic_event_results(event_type, points DESC NULLS LAST);

-- Efficiency results indexes
CREATE INDEX IF NOT EXISTS idx_efficiency_results_team ON efficiency_results(team_id);

-- Penalty rules indexes
CREATE INDEX IF NOT EXISTS idx_penalty_rules_event_type ON penalty_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_penalty_rules_active ON penalty_rules(active) WHERE active = true;

-- Judged events indexes
CREATE INDEX IF NOT EXISTS idx_judged_event_criteria_event_id ON judged_event_criteria(event_id);
CREATE INDEX IF NOT EXISTS idx_judged_event_bookings_event_id ON judged_event_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_judged_event_bookings_team_id ON judged_event_bookings(team_id);
CREATE INDEX IF NOT EXISTS idx_judged_event_scores_booking_id ON judged_event_scores(booking_id);
CREATE INDEX IF NOT EXISTS idx_judged_event_scores_judge_id ON judged_event_scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_judged_event_scores_criterion_id ON judged_event_scores(criterion_id);

-- Feedback system indexes
CREATE INDEX IF NOT EXISTS idx_feedback_bookings_team_id ON feedback_bookings(team_id);
CREATE INDEX IF NOT EXISTS idx_feedback_bookings_slot_id ON feedback_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_feedback_bookings_status ON feedback_bookings(status);
CREATE INDEX IF NOT EXISTS idx_feedback_judge_assignments_booking_id ON feedback_judge_assignments(booking_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Team uploads indexes
CREATE INDEX IF NOT EXISTS idx_team_uploads_team_id ON team_uploads(team_id);
CREATE INDEX IF NOT EXISTS idx_team_uploads_uploaded_by ON team_uploads(uploaded_by);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at DESC);

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inspection_results_updated_at ON inspection_results;
CREATE TRIGGER update_inspection_results_updated_at
    BEFORE UPDATE ON inspection_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inspection_progress_updated_at ON inspection_progress;
CREATE TRIGGER update_inspection_progress_updated_at
    BEFORE UPDATE ON inspection_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_track_sessions_updated_at ON track_sessions;
CREATE TRIGGER update_track_sessions_updated_at
    BEFORE UPDATE ON track_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feedback_bookings_updated_at ON feedback_bookings;
CREATE TRIGGER update_feedback_bookings_updated_at
    BEFORE UPDATE ON feedback_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, email, first_name, last_name, father_name, phone,
        emergency_contact, campsite_staying, ehic_number, app_role, profile_completed
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'father_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'emergency_contact', ''),
        COALESCE((NEW.raw_user_meta_data->>'campsite_staying')::boolean, false),
        COALESCE(NEW.raw_user_meta_data->>'ehic_number', NULL),
        COALESCE((NEW.raw_user_meta_data->>'app_role')::public.user_role, 'viewer'),
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to apply penalties to runs
CREATE OR REPLACE FUNCTION apply_penalties_to_runs()
RETURNS TABLE(updated_count integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    run_record RECORD;
    penalty_time DECIMAL(10,3);
    calculated_corrected_time DECIMAL(10,3);
    updated_count INTEGER := 0;
    error_msg TEXT := '';
BEGIN
    FOR run_record IN 
        SELECT id, team_id, event_type, run_number, raw_time, penalties, corrected_time, status
        FROM dynamic_event_runs
        WHERE raw_time IS NOT NULL
    LOOP
        BEGIN
            penalty_time := 0;
            
            IF run_record.penalties IS NOT NULL THEN
                IF (run_record.penalties->>'dsq')::boolean = true THEN
                    UPDATE dynamic_event_runs
                    SET corrected_time = NULL, status = 'dsq'::public.run_status
                    WHERE id = run_record.id;
                    updated_count := updated_count + 1;
                    CONTINUE;
                END IF;
                
                IF run_record.penalties->>'cones' IS NOT NULL THEN
                    penalty_time := penalty_time + ((run_record.penalties->>'cones')::integer * 0.5);
                END IF;
                
                IF run_record.penalties->>'off_course' IS NOT NULL THEN
                    penalty_time := penalty_time + ((run_record.penalties->>'off_course')::integer * 2.0);
                END IF;
            END IF;
            
            calculated_corrected_time := run_record.raw_time + penalty_time;
            
            UPDATE dynamic_event_runs
            SET corrected_time = calculated_corrected_time, updated_at = NOW()
            WHERE id = run_record.id;
            
            updated_count := updated_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                error_msg := error_msg || 'Error processing run ' || run_record.id::text || ': ' || SQLERRM || '; ';
        END;
    END LOOP;
    
    RETURN QUERY SELECT updated_count, error_msg;
END;
$$;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.user_team()
RETURNS uuid AS $$
BEGIN
    RETURN (SELECT team_id FROM public.user_profiles WHERE id = (SELECT auth.uid()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
    user_role_value public.user_role;
BEGIN
    SELECT app_role INTO user_role_value 
    FROM public.user_profiles 
    WHERE id = (SELECT auth.uid());
    RETURN COALESCE(user_role_value = 'admin'::public.user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_team_leader()
RETURNS boolean AS $$
DECLARE
    user_role_value public.user_role;
BEGIN
    SELECT app_role INTO user_role_value 
    FROM public.user_profiles 
    WHERE id = (SELECT auth.uid());
    RETURN COALESCE(user_role_value = 'team_leader'::public.user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role AS $$
DECLARE
    user_role_value public.user_role;
BEGIN
    SELECT app_role INTO user_role_value
    FROM public.user_profiles
    WHERE id = (SELECT auth.uid());
    RETURN COALESCE(user_role_value, 'viewer'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_team_leader_of_user(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
    current_user_id uuid;
    current_user_team_id uuid;
    target_user_team_id uuid;
    current_user_role public.user_role;
BEGIN
    current_user_id := (SELECT auth.uid());
    IF current_user_id IS NULL THEN RETURN false; END IF;

    SELECT team_id, app_role INTO current_user_team_id, current_user_role
    FROM public.user_profiles WHERE id = current_user_id;

    IF current_user_team_id IS NULL OR current_user_role IS NULL THEN RETURN false; END IF;
    IF current_user_role != 'team_leader'::public.user_role THEN RETURN false; END IF;

    SELECT team_id INTO target_user_team_id FROM public.user_profiles WHERE id = target_user_id;
    RETURN target_user_team_id IS NOT NULL AND current_user_team_id = target_user_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    target_user_id uuid,
    notification_type public.notification_type,
    notification_title text,
    notification_message text,
    notification_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    notification_id uuid;
    current_user_role public.user_role;
BEGIN
    SELECT app_role INTO current_user_role
    FROM public.user_profiles
    WHERE id = (SELECT auth.uid());
    
    IF current_user_role != 'admin'::public.user_role THEN
        RAISE EXCEPTION 'Only admins can create notifications';
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (target_user_id, notification_type, notification_title, notification_message, notification_link)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_event_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_event_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE efficiency_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE judged_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE judged_event_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE judged_event_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE judged_event_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_score_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Drop all existing policies
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Teams policies (separated to avoid multiple permissive policies)
CREATE POLICY "teams_select" ON teams FOR SELECT USING (
    (SELECT auth.role()) = 'authenticated' OR public.is_admin()
);
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (public.is_admin());
CREATE POLICY "teams_delete" ON teams FOR DELETE USING (public.is_admin());

-- User profiles policies
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT USING (
    id = (SELECT auth.uid()) OR team_id = public.user_team() OR public.is_admin()
);
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE USING (
    id = (SELECT auth.uid()) OR public.is_admin() OR public.is_team_leader_of_user(id)
) WITH CHECK (
    (id = (SELECT auth.uid()) AND app_role = public.current_user_role()) OR
    public.is_admin() OR
    (public.is_team_leader_of_user(id) AND id != (SELECT auth.uid()) 
     AND app_role IN ('team_leader', 'inspection_responsible', 'team_member'))
);

-- Inspection types policies (separated to avoid multiple permissive policies)
CREATE POLICY "inspection_types_select" ON inspection_types FOR SELECT USING (
    (SELECT auth.role()) = 'authenticated' OR public.is_admin()
);
CREATE POLICY "inspection_types_insert" ON inspection_types FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "inspection_types_update" ON inspection_types FOR UPDATE USING (public.is_admin());
CREATE POLICY "inspection_types_delete" ON inspection_types FOR DELETE USING (public.is_admin());

-- Bookings policies
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
    team_id = public.user_team() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role IN ('scrutineer', 'admin'))
);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (
    public.is_admin() OR
    (team_id = public.user_team() AND EXISTS (
        SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) 
        AND app_role IN ('team_leader', 'inspection_responsible')
    ))
);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role IN ('scrutineer', 'admin')) OR
    (team_id = public.user_team() AND status = 'upcoming' AND EXISTS (
        SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) 
        AND app_role IN ('team_leader', 'inspection_responsible')
    ))
);
CREATE POLICY "bookings_delete" ON bookings FOR DELETE USING (
    public.is_admin() OR
    (team_id = public.user_team() AND status = 'upcoming' AND EXISTS (
        SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) 
        AND app_role IN ('team_leader', 'inspection_responsible')
    ))
);

-- Inspection results policies (combined to avoid multiple permissive policies)
CREATE POLICY "inspection_results_manage" ON inspection_results FOR ALL USING (
    booking_id IN (SELECT id FROM bookings WHERE team_id = public.user_team()) OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role IN ('scrutineer', 'admin'))
);

-- Checklist templates policies (separated to avoid multiple permissive policies)
CREATE POLICY "checklist_templates_select" ON checklist_templates FOR SELECT USING (
    (SELECT auth.role()) = 'authenticated' OR public.is_admin()
);
CREATE POLICY "checklist_templates_insert" ON checklist_templates FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "checklist_templates_update" ON checklist_templates FOR UPDATE USING (public.is_admin());
CREATE POLICY "checklist_templates_delete" ON checklist_templates FOR DELETE USING (public.is_admin());

-- Inspection progress policies (combined to avoid multiple permissive policies)
CREATE POLICY "inspection_progress_manage" ON inspection_progress FOR ALL USING (
    booking_id IN (SELECT id FROM bookings WHERE team_id = public.user_team()) OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role IN ('scrutineer', 'admin'))
);

-- Inspection comments policies (combined to avoid multiple permissive policies)
CREATE POLICY "inspection_comments_manage" ON inspection_comments FOR ALL USING (
    booking_id IN (SELECT id FROM bookings WHERE team_id = public.user_team()) OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role IN ('scrutineer', 'admin'))
);

-- Track sessions policies (combined to avoid multiple permissive policies)
CREATE POLICY "track_sessions_manage" ON track_sessions FOR ALL USING (
    team_id = public.user_team() OR
    marshal_id = (SELECT auth.uid()) OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role = 'track_marshal')
);

-- Track incidents policies (combined to avoid multiple permissive policies)
CREATE POLICY "track_incidents_manage" ON track_incidents FOR ALL USING (
    team_id = public.user_team() OR
    marshal_id = (SELECT auth.uid()) OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role = 'track_marshal')
);

-- Track activity log policies
CREATE POLICY "track_activity_log_select" ON track_activity_log FOR SELECT USING (
    team_id = public.user_team() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role = 'track_marshal')
);
CREATE POLICY "track_activity_log_insert" ON track_activity_log FOR INSERT WITH CHECK (
    marshal_id = (SELECT auth.uid()) OR public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role = 'track_marshal')
);

-- Dynamic event runs policies (combined to avoid multiple permissive policies)
CREATE POLICY "dynamic_runs_manage" ON dynamic_event_runs FOR ALL USING (
    team_id = public.user_team() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role IN ('track_marshal', 'viewer'))
);

-- Dynamic event results policies (combined to avoid multiple permissive policies)
CREATE POLICY "dynamic_results_manage" ON dynamic_event_results FOR ALL USING (
    (SELECT auth.role()) = 'authenticated' OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role = 'track_marshal')
);

-- Efficiency results policies (combined to avoid multiple permissive policies)
CREATE POLICY "efficiency_results_manage" ON efficiency_results FOR ALL USING (
    (SELECT auth.role()) = 'authenticated' OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND app_role = 'track_marshal')
);

-- Penalty rules policies (combined to avoid multiple permissive policies)
CREATE POLICY "penalty_rules_manage" ON penalty_rules FOR ALL USING (
    (SELECT auth.role()) = 'authenticated' OR public.is_admin()
);

-- Judged events policies (combined to avoid multiple permissive policies)
CREATE POLICY "judged_events_manage" ON judged_events FOR ALL USING (
    (SELECT auth.role()) = 'authenticated' OR public.is_admin()
);

CREATE POLICY "judged_event_criteria_manage" ON judged_event_criteria FOR ALL USING (
    (SELECT auth.role()) = 'authenticated' OR public.is_admin()
);

CREATE POLICY "judged_event_bookings_select" ON judged_event_bookings FOR SELECT USING (
    team_id = public.user_team() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) 
            AND app_role IN ('bp_judge', 'cm_judge', 'design_judge_software', 'design_judge_mechanical', 
                            'design_judge_electronics', 'design_judge_overall'))
);

CREATE POLICY "judged_event_scores_manage" ON judged_event_scores FOR ALL USING (
    judge_id = (SELECT auth.uid()) OR
    booking_id IN (SELECT id FROM judged_event_bookings WHERE team_id = public.user_team()) OR
    public.is_admin()
);

CREATE POLICY "judge_score_audit_select" ON judge_score_audit FOR SELECT USING (public.is_admin());

-- Feedback slots policies (combined to avoid multiple permissive policies)
CREATE POLICY "feedback_slots_manage" ON feedback_slots FOR ALL USING (
    (SELECT auth.role()) = 'authenticated' OR public.is_admin()
);

-- Feedback bookings policies
CREATE POLICY "feedback_bookings_select" ON feedback_bookings FOR SELECT USING (
    team_id = public.user_team() OR
    requested_by = (SELECT auth.uid()) OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) 
            AND app_role IN ('bp_judge', 'cm_judge', 'design_judge_software', 'design_judge_mechanical', 
                            'design_judge_electronics', 'design_judge_overall'))
);
CREATE POLICY "feedback_bookings_insert" ON feedback_bookings FOR INSERT WITH CHECK (
    requested_by = (SELECT auth.uid()) AND team_id = public.user_team()
);
CREATE POLICY "feedback_bookings_update" ON feedback_bookings FOR UPDATE USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) 
            AND app_role IN ('bp_judge', 'cm_judge', 'design_judge_software', 'design_judge_mechanical', 
                            'design_judge_electronics', 'design_judge_overall'))
);

CREATE POLICY "feedback_judge_assignments_select" ON feedback_judge_assignments FOR SELECT USING (
    judge_id = (SELECT auth.uid()) OR public.is_admin()
);

-- Notifications policies
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = (SELECT auth.uid()));
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (public.is_admin());

-- Team uploads policies
CREATE POLICY "team_uploads_select" ON team_uploads FOR SELECT USING (
    team_id = public.user_team() OR public.is_admin()
);
CREATE POLICY "team_uploads_insert" ON team_uploads FOR INSERT WITH CHECK (
    uploaded_by = (SELECT auth.uid()) AND
    (team_id = public.user_team() OR public.is_admin() OR 
     (public.is_team_leader() AND team_id = public.user_team()))
);

-- Audit logs policies
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION apply_penalties_to_runs() TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, public.notification_type, text, text, text) TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE teams IS 'Formula Student teams participating in the competition';
COMMENT ON TABLE user_profiles IS 'Extended user profiles linked to auth.users';
COMMENT ON TABLE inspection_types IS 'Types of inspections (pre-inspection, mechanical, accumulator, etc.)';
COMMENT ON TABLE bookings IS 'Inspection booking slots for teams';
COMMENT ON TABLE inspection_results IS 'Overall results for each inspection booking';
COMMENT ON TABLE checklist_templates IS 'Template checklist items for each inspection type';
COMMENT ON TABLE inspection_progress IS 'Progress tracking for individual checklist items during inspections';
COMMENT ON TABLE inspection_comments IS 'Comments on specific inspection checklist items';
COMMENT ON TABLE track_sessions IS 'Track entry/exit sessions logged by marshals';
COMMENT ON TABLE track_incidents IS 'Track incidents (DOO, OOC, etc.) logged by marshals';
COMMENT ON TABLE track_activity_log IS 'Activity log for track events';
COMMENT ON TABLE dynamic_event_runs IS 'Individual run times for dynamic events (acceleration, skidpad, autocross, endurance)';
COMMENT ON TABLE dynamic_event_results IS 'Calculated results and points for dynamic events';
COMMENT ON TABLE efficiency_results IS 'Efficiency scoring combined with endurance';
COMMENT ON TABLE penalty_rules IS 'Configurable penalty rules for dynamic events';
COMMENT ON TABLE judged_events IS 'Judged events (Engineering Design, Business Plan, Cost & Manufacturing)';
COMMENT ON TABLE judged_event_criteria IS 'Scoring criteria for judged events';
COMMENT ON TABLE judged_event_bookings IS 'Team bookings for judged events';
COMMENT ON TABLE judged_event_scores IS 'Individual judge scores for each criterion';
COMMENT ON TABLE judge_score_audit IS 'Audit trail for score changes by admins';
COMMENT ON TABLE feedback_slots IS 'Available time slots for feedback sessions';
COMMENT ON TABLE feedback_bookings IS 'Team bookings for feedback sessions';
COMMENT ON TABLE feedback_judge_assignments IS 'Judge assignments to feedback bookings';
COMMENT ON TABLE notifications IS 'System notifications for users';
COMMENT ON TABLE team_uploads IS 'Documents uploaded by teams';
COMMENT ON TABLE audit_logs IS 'System-wide audit log for data changes';

COMMENT ON FUNCTION apply_penalties_to_runs() IS 'Applies penalties to all runs based on penalties JSONB field and calculates corrected_time';
COMMENT ON FUNCTION create_notification(uuid, notification_type, text, text, text) IS 'Creates a notification for a user (admin only)';

