-- Allow parental approval notifications in tutor_notifications
ALTER TABLE public.tutor_notifications
  DROP CONSTRAINT IF EXISTS tutor_notifications_type_check;

ALTER TABLE public.tutor_notifications
  ADD CONSTRAINT tutor_notifications_type_check
  CHECK (
    type = ANY (ARRAY[
      'strike_limit'::text,
      'suspension'::text,
      'warning'::text,
      'approval'::text
    ])
  );
