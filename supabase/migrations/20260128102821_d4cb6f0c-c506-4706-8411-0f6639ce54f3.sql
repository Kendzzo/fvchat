-- 1. Add last_seen_at to profiles for presence
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Create message_reads table for tracking read status
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on message_reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_reads
CREATE POLICY "Users can view their own read receipts"
  ON public.message_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
  ON public.message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3. Create conversation_settings table for muted chats
CREATE TABLE IF NOT EXISTS public.conversation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Enable RLS on conversation_settings
ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_settings
CREATE POLICY "Users can view their own settings"
  ON public.conversation_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own settings"
  ON public.conversation_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON public.conversation_settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS on blocked_users
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for blocked_users
CREATE POLICY "Users can view their blocks"
  ON public.blocked_users FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE
  USING (blocker_id = auth.uid());

-- 5. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  reported_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for message_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;