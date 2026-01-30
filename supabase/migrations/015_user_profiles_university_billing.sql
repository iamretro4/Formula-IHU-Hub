-- =====================================================
-- Add University, Faculty Advisor, Billing, VAT to user_profiles
-- Migration: 015_user_profiles_university_billing.sql
-- =====================================================

-- Add new columns to user_profiles (nullable for existing rows)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS university_name text,
  ADD COLUMN IF NOT EXISTS faculty_advisor_name text,
  ADD COLUMN IF NOT EXISTS faculty_advisor_position text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS vat_id text;

-- Update handle_new_user to include new metadata fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, email, first_name, last_name, father_name, phone,
        emergency_contact, campsite_staying, ehic_number, app_role, profile_completed,
        university_name, faculty_advisor_name, faculty_advisor_position, billing_address, vat_id
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
        false,
        COALESCE(NEW.raw_user_meta_data->>'university_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'faculty_advisor_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'faculty_advisor_position', NULL),
        COALESCE(NEW.raw_user_meta_data->>'billing_address', NULL),
        COALESCE(NEW.raw_user_meta_data->>'vat_id', NULL)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.user_profiles.university_name IS 'University or institution name from registration';
COMMENT ON COLUMN public.user_profiles.faculty_advisor_name IS 'Faculty advisor full name';
COMMENT ON COLUMN public.user_profiles.faculty_advisor_position IS 'Faculty advisor position or title';
COMMENT ON COLUMN public.user_profiles.billing_address IS 'Billing address for invoices';
COMMENT ON COLUMN public.user_profiles.vat_id IS 'VAT identification number';
