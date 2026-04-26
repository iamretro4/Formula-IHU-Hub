-- =====================================================
-- Fix: RLS Disabled in Public for spatial_ref_sys
-- Description: Enables Row Level Security on the PostGIS
-- metadata table and grants public read access to
-- satisfy Supabase security linting.
-- =====================================================

-- Enable Row Level Security on the spatial_ref_sys table
-- Note: We swap ownership to postgres first to ensure we have permission to modify it
ALTER TABLE public.spatial_ref_sys OWNER TO postgres;
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Allow all users (including anon) to read the spatial reference systems
-- This is standard for PostGIS functionality in public schemas.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'spatial_ref_sys' 
        AND policyname = 'Allow public read access for spatial_ref_sys'
    ) THEN
        CREATE POLICY "Allow public read access for spatial_ref_sys" 
        ON public.spatial_ref_sys 
        FOR SELECT 
        USING (true);
    END IF;
END $$;
