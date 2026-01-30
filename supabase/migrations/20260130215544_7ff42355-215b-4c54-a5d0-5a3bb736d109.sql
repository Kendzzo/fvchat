-- Add profile_photo_completed flag to track mandatory selfie completion
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_photo_completed boolean NOT NULL DEFAULT false;

-- Create index for efficient routing checks
CREATE INDEX IF NOT EXISTS idx_profiles_photo_completed 
ON public.profiles(id) 
WHERE profile_photo_completed = false;