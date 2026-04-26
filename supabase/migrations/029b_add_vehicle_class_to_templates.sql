
-- Add vehicle_class to checklist_templates
ALTER TABLE public.checklist_templates 
ADD COLUMN IF NOT EXISTS vehicle_class public.vehicle_class;

-- Update existing records if any (default to EV as a safe bet, or based on item_code)
UPDATE public.checklist_templates
SET vehicle_class = 'EV'
WHERE vehicle_class IS NULL;

-- Remove old unique constraint
ALTER TABLE public.checklist_templates
DROP CONSTRAINT IF EXISTS checklist_templates_inspection_type_id_item_code_key;

-- Add new unique constraint including vehicle_class
ALTER TABLE public.checklist_templates
ADD CONSTRAINT checklist_templates_class_item_key 
UNIQUE(inspection_type_id, item_code, vehicle_class);

-- Comment for documentation
COMMENT ON COLUMN public.checklist_templates.vehicle_class IS 'The vehicle class (EV/CV) this template item belongs to';
