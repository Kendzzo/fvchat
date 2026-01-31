-- Add intro_completed column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS intro_completed boolean NOT NULL DEFAULT false;