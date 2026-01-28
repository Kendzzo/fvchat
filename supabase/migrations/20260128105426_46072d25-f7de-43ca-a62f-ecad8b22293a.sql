-- Add suspended_until to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ DEFAULT NULL;

-- Create moderation_events table
CREATE TABLE IF NOT EXISTS public.moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  surface TEXT NOT NULL CHECK (surface IN ('chat', 'post', 'comment')),
  text_snippet TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  categories JSONB DEFAULT '[]'::jsonb,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tutor_notifications table
CREATE TABLE IF NOT EXISTS public.tutor_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_email TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('strike_limit', 'suspension', 'warning')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'dismissed')),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_events_user_id ON public.moderation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_events_created_at ON public.moderation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_allowed ON public.moderation_events(allowed);
CREATE INDEX IF NOT EXISTS idx_tutor_notifications_status ON public.tutor_notifications(status);
CREATE INDEX IF NOT EXISTS idx_tutor_notifications_user_id ON public.tutor_notifications(user_id);

-- Enable RLS
ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for moderation_events (admin only for read, service role for write)
CREATE POLICY "Admins can view all moderation events"
ON public.moderation_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage moderation events"
ON public.moderation_events FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own moderation events"
ON public.moderation_events FOR SELECT
USING (user_id = auth.uid());

-- RLS policies for tutor_notifications (admin only)
CREATE POLICY "Admins can view all tutor notifications"
ON public.tutor_notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage tutor notifications"
ON public.tutor_notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Function to count strikes in last 24 hours
CREATE OR REPLACE FUNCTION public.get_strikes_24h(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.moderation_events
  WHERE user_id = _user_id
    AND allowed = false
    AND created_at > (now() - interval '24 hours')
$$;

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION public.is_user_suspended(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT suspended_until > now() FROM public.profiles WHERE id = _user_id),
    false
  )
$$;