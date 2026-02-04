-- SECURITY FIX: Remove all development RLS policies that expose data
-- These policies allow unauthenticated/unrestricted access to sensitive data

-- Drop Dev policies from profiles
DROP POLICY IF EXISTS "Dev - All users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Dev - Create own profile" ON public.profiles;

-- Drop Dev policies from posts
DROP POLICY IF EXISTS "Dev - All users can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Dev - Create posts" ON public.posts;

-- Drop Dev policies from comments
DROP POLICY IF EXISTS "Dev - All users can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Dev - All users can comment on posts" ON public.comments;
DROP POLICY IF EXISTS "Dev - Parent approved can comment" ON public.comments;

-- Drop Dev policies from challenges
DROP POLICY IF EXISTS "Dev - All users can view all challenges" ON public.challenges;
DROP POLICY IF EXISTS "Dev - Authenticated users can create challenges" ON public.challenges;

-- Drop Dev policies from chats
DROP POLICY IF EXISTS "Dev - View all chats" ON public.chats;
DROP POLICY IF EXISTS "Dev - Create chats" ON public.chats;

-- Drop Dev policies from messages
DROP POLICY IF EXISTS "Dev - View all messages" ON public.messages;
DROP POLICY IF EXISTS "Dev - Send messages" ON public.messages;

-- Drop Dev policies from friendships
DROP POLICY IF EXISTS "Dev - View all friendships" ON public.friendships;
DROP POLICY IF EXISTS "Dev - Send friend requests" ON public.friendships;

-- Drop Dev policies from user_roles (CRITICAL - allows self-assignment of admin)
DROP POLICY IF EXISTS "Dev - View user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Dev - Insert user roles" ON public.user_roles;

-- Drop Dev policies from rewards
DROP POLICY IF EXISTS "Dev - View all rewards" ON public.rewards;

-- Drop Dev policies from tutors
DROP POLICY IF EXISTS "Dev - View tutors" ON public.tutors;
DROP POLICY IF EXISTS "Dev - Create tutors" ON public.tutors;

-- Drop Dev policies from challenge_entries
DROP POLICY IF EXISTS "Dev - All users can create challenge entries" ON public.challenge_entries;

-- SECURITY FIX: Make content bucket private
UPDATE storage.buckets SET public = false WHERE id = 'content';