-- =============================================
-- VFC DATABASE SCHEMA - PHASE 1: TYPES & TABLES
-- =============================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.account_status AS ENUM ('pending_approval', 'active', 'suspended');
CREATE TYPE public.friendship_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.post_privacy AS ENUM ('friends_only', 'same_age_group');
CREATE TYPE public.content_type AS ENUM ('photo', 'video', 'text', 'audio', 'image');
CREATE TYPE public.age_group AS ENUM ('6-8', '9-12', '13-16');

-- 2. TABLES (in dependency order)

-- User Roles Table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Profiles Table (child users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nick text UNIQUE NOT NULL,
  birth_year integer NOT NULL CHECK (birth_year >= 2008 AND birth_year <= 2020),
  age_group public.age_group NOT NULL DEFAULT '9-12',
  avatar_data jsonb DEFAULT '{}'::jsonb,
  tutor_email text NOT NULL,
  account_status public.account_status NOT NULL DEFAULT 'pending_approval',
  language_infractions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tutors Table
CREATE TABLE public.tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  approval_history jsonb DEFAULT '[]'::jsonb,
  children_ids uuid[] DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Challenges Table (daily challenges)
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  challenge_date date UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Posts Table (publications)
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type public.content_type NOT NULL,
  content_url text,
  text text,
  privacy public.post_privacy NOT NULL DEFAULT 'friends_only',
  likes_count integer NOT NULL DEFAULT 0,
  is_challenge_entry boolean NOT NULL DEFAULT false,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Comments Table
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Challenge Entries Table
CREATE TABLE public.challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_url text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rewards Table
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL,
  item_data jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Friendships Table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  tutor_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (sender_id != receiver_id),
  UNIQUE (sender_id, receiver_id)
);

-- Chats Table
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  name text,
  participant_ids uuid[] NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_participants CHECK (array_length(participant_ids, 1) >= 2 AND array_length(participant_ids, 1) <= 10)
);

-- Messages Table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type public.content_type NOT NULL DEFAULT 'text',
  content text NOT NULL,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX idx_profiles_age_group ON public.profiles(age_group);
CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_challenge_id ON public.posts(challenge_id);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_friendships_sender_id ON public.friendships(sender_id);
CREATE INDEX idx_friendships_receiver_id ON public.friendships(receiver_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);
CREATE INDEX idx_chats_participant_ids ON public.chats USING GIN(participant_ids);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_challenge_entries_challenge_id ON public.challenge_entries(challenge_id);
CREATE INDEX idx_challenge_entries_likes ON public.challenge_entries(likes_count DESC);
CREATE INDEX idx_challenges_date ON public.challenges(challenge_date DESC);
CREATE INDEX idx_tutors_email ON public.tutors(email);

-- 4. SECURITY HELPER FUNCTIONS (after tables exist)

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is blocked (5+ infractions)
CREATE OR REPLACE FUNCTION public.is_blocked_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT language_infractions_count >= 5 FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Check if two users are approved friends
CREATE OR REPLACE FUNCTION public.is_friend(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE status = 'approved'
      AND tutor_approved = true
      AND (
        (sender_id = _user_a AND receiver_id = _user_b)
        OR (sender_id = _user_b AND receiver_id = _user_a)
      )
  )
$$;

-- Get user's age group
CREATE OR REPLACE FUNCTION public.get_user_age_group(_user_id uuid)
RETURNS public.age_group
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT age_group FROM public.profiles WHERE id = _user_id
$$;

-- Check if user is participant in chat
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chats
    WHERE id = _chat_id
      AND _user_id = ANY(participant_ids)
  )
$$;

-- Check if user can access a post based on privacy settings
CREATE OR REPLACE FUNCTION public.can_access_post(_user_id uuid, _post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_record RECORD;
BEGIN
  SELECT author_id, privacy INTO post_record FROM public.posts WHERE id = _post_id;
  
  IF post_record IS NULL THEN
    RETURN false;
  END IF;
  
  IF post_record.author_id = _user_id THEN
    RETURN true;
  END IF;
  
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;
  
  IF post_record.privacy = 'friends_only' THEN
    RETURN public.is_friend(_user_id, post_record.author_id);
  ELSIF post_record.privacy = 'same_age_group' THEN
    RETURN public.get_user_age_group(_user_id) = public.get_user_age_group(post_record.author_id);
  END IF;
  
  RETURN false;
END;
$$;

-- Calculate age group from birth year
CREATE OR REPLACE FUNCTION public.calculate_age_group(_birth_year integer)
RETURNS public.age_group
LANGUAGE plpgsql
IMMUTABLE
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

-- 5. TRIGGERS

-- Auto-calculate age group on profile insert/update
CREATE OR REPLACE FUNCTION public.auto_calculate_age_group()
RETURNS TRIGGER AS $$
BEGIN
  NEW.age_group := public.calculate_age_group(NEW.birth_year);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_age_group
  BEFORE INSERT OR UPDATE OF birth_year ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_age_group();

-- Check max challenge entries (3 per user per challenge)
CREATE OR REPLACE FUNCTION public.check_max_challenge_entries()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_max_challenge_entries
  BEFORE INSERT ON public.challenge_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_challenge_entries();

-- Increment infraction count when message is blocked
CREATE OR REPLACE FUNCTION public.increment_infraction_on_block()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_blocked = true AND (OLD IS NULL OR OLD.is_blocked = false) THEN
    UPDATE public.profiles
    SET language_infractions_count = language_infractions_count + 1,
        updated_at = now()
    WHERE id = NEW.sender_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_infraction_on_block
  AFTER INSERT OR UPDATE OF is_blocked ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_infraction_on_block();

-- Update timestamp on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. ENABLE RLS ON ALL TABLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- USER_ROLES POLICIES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view friends profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_friend(auth.uid(), id));

CREATE POLICY "Users can view same age group profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    age_group = public.get_user_age_group(auth.uid())
    AND account_status = 'active'
    AND NOT public.is_blocked_user(id)
  );

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- TUTORS POLICIES
CREATE POLICY "Tutors can view their own data"
  ON public.tutors FOR SELECT
  TO authenticated
  USING (
    email = (SELECT tutor_email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "System can insert tutors"
  ON public.tutors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage tutors"
  ON public.tutors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CHALLENGES POLICIES
CREATE POLICY "Anyone can view active challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage challenges"
  ON public.challenges FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- POSTS POLICIES
CREATE POLICY "Users can view accessible posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (public.can_access_post(auth.uid(), id));

CREATE POLICY "Active users can create posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND NOT public.is_blocked_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND account_status = 'active'
    )
  );

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Admins can manage all posts"
  ON public.posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- COMMENTS POLICIES
CREATE POLICY "Users can view comments on accessible posts"
  ON public.comments FOR SELECT
  TO authenticated
  USING (public.can_access_post(auth.uid(), post_id));

CREATE POLICY "Friends can comment on posts"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND NOT public.is_blocked_user(auth.uid())
    AND public.is_friend(auth.uid(), (SELECT author_id FROM public.posts WHERE id = post_id))
  );

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Admins can manage all comments"
  ON public.comments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CHALLENGE_ENTRIES POLICIES
CREATE POLICY "Anyone can view challenge entries"
  ON public.challenge_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Active users can create entries"
  ON public.challenge_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.is_blocked_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND account_status = 'active'
    )
  );

CREATE POLICY "Users can update their own entries"
  ON public.challenge_entries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own entries"
  ON public.challenge_entries FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all entries"
  ON public.challenge_entries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- REWARDS POLICIES
CREATE POLICY "Users can view their own rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all rewards"
  ON public.rewards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- FRIENDSHIPS POLICIES
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Active users can send friend requests"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND NOT public.is_blocked_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND account_status = 'active'
    )
  );

CREATE POLICY "Receiver can update friendship status"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

CREATE POLICY "Participants can delete friendships"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Admins can manage all friendships"
  ON public.friendships FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CHATS POLICIES
CREATE POLICY "Participants can view their chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create chats with friends"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = ANY(participant_ids)
    AND NOT public.is_blocked_user(auth.uid())
  );

CREATE POLICY "Participants can update chat"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = ANY(participant_ids))
  WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Admins can manage all chats"
  ON public.chats FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- MESSAGES POLICIES
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_chat_participant(auth.uid(), chat_id)
    AND NOT public.is_blocked_user(auth.uid())
  );

CREATE POLICY "Senders can update their messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admins can manage all messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('content', 'content', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav']);

-- Storage policies for avatars
CREATE POLICY "Users can view their own avatar"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for content
CREATE POLICY "Users can view accessible content"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Active users can upload content"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'content' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND NOT public.is_blocked_user(auth.uid())
  );

CREATE POLICY "Users can update their own content"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own content"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'content' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 9. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_entries;