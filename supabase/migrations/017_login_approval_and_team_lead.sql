-- =====================================================
-- Login approval: users can only sign in after admin approves
-- Team leaders: only admin can grant team_leader role (on approval)
-- Migration: 017_login_approval_and_team_lead.sql
-- =====================================================

-- 1. Add login_approved to user_profiles (default false for new users)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS login_approved boolean NOT NULL DEFAULT false;

-- Existing users: allow them to keep logging in (approve all existing)
UPDATE public.user_profiles SET login_approved = true;

COMMENT ON COLUMN public.user_profiles.login_approved IS 'If false, user cannot sign in until an admin approves.';

-- 2. Ensure handle_new_user sets login_approved = false, team_id, team_lead, and app_role = 'viewer'
--    (Only admin can later set app_role to team_leader when approving a team captain.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, email, first_name, last_name, father_name, phone,
        emergency_contact, campsite_staying, ehic_number, app_role, profile_completed,
        university_name, faculty_advisor_name, faculty_advisor_position, billing_address, vat_id,
        team_id, team_lead, login_approved
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
        'viewer'::public.user_role,
        false,
        COALESCE(NEW.raw_user_meta_data->>'university_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'faculty_advisor_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'faculty_advisor_position', NULL),
        COALESCE(NEW.raw_user_meta_data->>'billing_address', NULL),
        COALESCE(NEW.raw_user_meta_data->>'vat_id', NULL),
        (NEW.raw_user_meta_data->>'team_id')::uuid,
        COALESCE((NEW.raw_user_meta_data->>'team_lead')::boolean, false),
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
