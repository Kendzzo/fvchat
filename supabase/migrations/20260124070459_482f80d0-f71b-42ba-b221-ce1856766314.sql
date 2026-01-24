-- =============================================
-- DEVELOPMENT RLS POLICIES - PERMISSIVE FOR TESTING
-- =============================================

-- Allow profiles to be viewed by all authenticated users (for development)
CREATE POLICY "Dev - All users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow posts to be viewed by all authenticated users (for development)  
CREATE POLICY "Dev - All users can view all posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (true);

-- Allow comments to be viewed by all authenticated users
CREATE POLICY "Dev - All users can view all comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to comment on any post (for development)
CREATE POLICY "Dev - All users can comment on posts"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Allow all challenges to be viewed
CREATE POLICY "Dev - All users can view all challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (true);

-- Allow creating challenges (for testing)
CREATE POLICY "Dev - Authenticated users can create challenges"
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to create entries without active account check (for dev)
CREATE POLICY "Dev - All users can create challenge entries"
  ON public.challenge_entries FOR INSERT
  TO authenticated  
  WITH CHECK (user_id = auth.uid());

-- Allow viewing all chats (for development)
CREATE POLICY "Dev - View all chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (true);

-- Allow creating chats without friendship check (for dev)
CREATE POLICY "Dev - Create chats"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow viewing all messages (for dev)
CREATE POLICY "Dev - View all messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (true);

-- Allow sending messages without participant check (for dev)
CREATE POLICY "Dev - Send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Allow viewing all friendships
CREATE POLICY "Dev - View all friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (true);

-- Allow sending friend requests without account status check
CREATE POLICY "Dev - Send friend requests"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Allow users to create their own profile
CREATE POLICY "Dev - Create own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to create posts without restrictions
CREATE POLICY "Dev - Create posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Allow viewing all rewards
CREATE POLICY "Dev - View all rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (true);

-- Allow inserting user roles
CREATE POLICY "Dev - Insert user roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow viewing all user roles
CREATE POLICY "Dev - View user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Allow tutors to be created
CREATE POLICY "Dev - Create tutors"
  ON public.tutors FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow viewing tutors
CREATE POLICY "Dev - View tutors"
  ON public.tutors FOR SELECT
  TO authenticated
  USING (true);