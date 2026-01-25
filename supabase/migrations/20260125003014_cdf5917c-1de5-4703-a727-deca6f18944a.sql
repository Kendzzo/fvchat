-- Add parent_approved column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parent_approved boolean NOT NULL DEFAULT false;

-- Update existing active users to be parent_approved (for development)
UPDATE public.profiles SET parent_approved = true WHERE account_status = 'active';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_parent_approved ON public.profiles(parent_approved);

-- Update RLS policy for friendships to check parent_approved
DROP POLICY IF EXISTS "Active users can send friend requests" ON public.friendships;
CREATE POLICY "Parent approved users can send friend requests" 
ON public.friendships FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND NOT is_blocked_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND parent_approved = true
  )
);

-- Update comments policy to require parent_approved AND friendship
DROP POLICY IF EXISTS "Friends can comment on posts" ON public.comments;
CREATE POLICY "Parent approved friends can comment" 
ON public.comments FOR INSERT
WITH CHECK (
  author_id = auth.uid() 
  AND NOT is_blocked_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND parent_approved = true
  )
  AND is_friend(auth.uid(), (SELECT author_id FROM posts WHERE id = post_id))
);

-- Dev policy for comments (allows commenting for testing)
CREATE POLICY "Dev - Parent approved can comment"
ON public.comments FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND parent_approved = true
  )
);