-- Add legal acceptance fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS legal_accepted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS legal_version text;