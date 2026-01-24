-- =============================================
-- SECURITY FIXES: Function search_path and permissive policy
-- =============================================

-- Fix trigger functions with proper search_path

CREATE OR REPLACE FUNCTION public.auto_calculate_age_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.age_group := public.calculate_age_group(NEW.birth_year);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_max_challenge_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  entry_count integer;
BEGIN
  SELECT COUNT(*) INTO entry_count
  FROM public.challenge_entries
  WHERE challenge_id = NEW.challenge_id AND user_id = NEW.user_id;
  
  IF entry_count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 entries per challenge allowed';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_infraction_on_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_blocked = true AND (OLD IS NULL OR OLD.is_blocked = false) THEN
    UPDATE public.profiles
    SET language_infractions_count = language_infractions_count + 1,
        updated_at = now()
    WHERE id = NEW.sender_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_age_group(_birth_year integer)
RETURNS public.age_group
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  current_age integer;
BEGIN
  current_age := EXTRACT(YEAR FROM CURRENT_DATE) - _birth_year;
  
  IF current_age >= 6 AND current_age <= 8 THEN
    RETURN '6-8'::public.age_group;
  ELSIF current_age >= 9 AND current_age <= 12 THEN
    RETURN '9-12'::public.age_group;
  ELSIF current_age >= 13 AND current_age <= 16 THEN
    RETURN '13-16'::public.age_group;
  ELSE
    RETURN '13-16'::public.age_group;
  END IF;
END;
$$;

-- Fix the permissive tutors INSERT policy
-- The policy allows any authenticated user to insert tutors, but we need to restrict it
-- to only allow inserting tutors when the email matches the tutor_email of the inserting user's profile

DROP POLICY IF EXISTS "System can insert tutors" ON public.tutors;

CREATE POLICY "Users can create tutor for their own tutor_email"
  ON public.tutors FOR INSERT
  TO authenticated
  WITH CHECK (
    email = (SELECT tutor_email FROM public.profiles WHERE id = auth.uid())
  );