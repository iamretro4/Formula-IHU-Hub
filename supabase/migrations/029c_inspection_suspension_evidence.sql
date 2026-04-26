-- Add 'suspended' to result_status enum
ALTER TYPE public.result_status ADD VALUE IF NOT EXISTS 'suspended';

-- Add file_url to inspection_comments for photo/video evidence
ALTER TABLE public.inspection_comments ADD COLUMN IF NOT EXISTS file_url text;
