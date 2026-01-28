-- Add is_default column to stickers for starter stickers
ALTER TABLE public.stickers ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Create index on is_default for faster queries
CREATE INDEX IF NOT EXISTS idx_stickers_is_default ON public.stickers(is_default);

-- Create challenge_rewards table for linking stickers to challenge positions
CREATE TABLE IF NOT EXISTS public.challenge_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1 AND position <= 3),
  reward_type text NOT NULL DEFAULT 'sticker',
  reward_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, position)
);

-- Create challenge_winners table to track who won what
CREATE TABLE IF NOT EXISTS public.challenge_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  position integer NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Add rewards_assigned flag to challenges to track if daily rewards were processed
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS rewards_assigned boolean NOT NULL DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.challenge_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_winners ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenge_rewards
CREATE POLICY "Anyone can view challenge rewards"
  ON public.challenge_rewards FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage challenge rewards"
  ON public.challenge_rewards FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for challenge_winners
CREATE POLICY "Anyone can view challenge winners"
  ON public.challenge_winners FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage challenge winners"
  ON public.challenge_winners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create a table for tracking challenge entry likes
CREATE TABLE IF NOT EXISTS public.challenge_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(entry_id, user_id)
);

ALTER TABLE public.challenge_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view challenge likes"
  ON public.challenge_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like challenge entries"
  ON public.challenge_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike their likes"
  ON public.challenge_likes FOR DELETE
  USING (user_id = auth.uid());