-- =============================================
-- PASO 1: AÑADIR profile_photo_url A profiles
-- =============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS profile_photo_url text NULL,
  ADD COLUMN IF NOT EXISTS profile_photo_updated_at timestamp with time zone NULL;

-- =============================================
-- PASO 2: CREAR TABLA stickers (catálogo)
-- =============================================
CREATE TABLE IF NOT EXISTS public.stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic')),
  category text NOT NULL,
  image_url text NOT NULL,
  prompt text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para stickers
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stickers" ON public.stickers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage stickers" ON public.stickers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PASO 3: CREAR TABLA user_stickers (inventario)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sticker_id uuid NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'default',
  UNIQUE(user_id, sticker_id)
);

-- RLS para user_stickers
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stickers" ON public.user_stickers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can unlock stickers" ON public.user_stickers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all user stickers" ON public.user_stickers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PASO 4: CREAR TABLA post_stickers (overlay en posts)
-- =============================================
CREATE TABLE IF NOT EXISTS public.post_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  sticker_id uuid NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  x float NOT NULL DEFAULT 0.5 CHECK (x >= 0 AND x <= 1),
  y float NOT NULL DEFAULT 0.5 CHECK (y >= 0 AND y <= 1),
  scale float NOT NULL DEFAULT 1.0 CHECK (scale >= 0.2 AND scale <= 3.0),
  rotation float NOT NULL DEFAULT 0 CHECK (rotation >= -180 AND rotation <= 180),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para post_stickers
ALTER TABLE public.post_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post stickers" ON public.post_stickers
  FOR SELECT USING (true);

CREATE POLICY "Post authors can add stickers" ON public.post_stickers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
  );

CREATE POLICY "Post authors can delete stickers" ON public.post_stickers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
  );

CREATE POLICY "Admins can manage all post stickers" ON public.post_stickers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PASO 5: AÑADIR sticker_id A messages
-- =============================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sticker_id uuid NULL REFERENCES public.stickers(id);

-- =============================================
-- PASO 6: CREAR BUCKET profile-photos (via storage)
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos', 
  'profile-photos', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage policies for profile-photos
CREATE POLICY "Profile photos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photo" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile photo" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile photo" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- PASO 7: CREAR BUCKET stickers
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stickers', 
  'stickers', 
  true, 
  2097152, -- 2MB
  ARRAY['image/png']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png'];

-- Storage policies for stickers
CREATE POLICY "Stickers are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'stickers');

CREATE POLICY "Admins can upload stickers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stickers' AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update stickers" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'stickers' AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.stickers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stickers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_stickers;