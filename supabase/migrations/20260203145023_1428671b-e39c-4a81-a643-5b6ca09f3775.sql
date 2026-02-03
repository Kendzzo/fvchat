-- Update get_strikes_24h to use strikes_reset_at as reference point
CREATE OR REPLACE FUNCTION public.get_strikes_24h(_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.moderation_events me
  WHERE me.user_id = _user_id
    AND me.allowed = false
    AND me.created_at > GREATEST(
      COALESCE((SELECT strikes_reset_at FROM public.profiles WHERE id = _user_id), '1970-01-01'::timestamptz),
      now() - interval '24 hours'
    )
$function$;