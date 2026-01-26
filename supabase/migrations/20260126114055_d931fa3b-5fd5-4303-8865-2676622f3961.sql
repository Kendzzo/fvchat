-- MVP: Change parent_approved default to true for free registration
ALTER TABLE public.profiles ALTER COLUMN parent_approved SET DEFAULT true;

-- Update existing users to be approved
UPDATE public.profiles SET parent_approved = true WHERE parent_approved = false;