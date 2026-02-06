-- ============================================
-- FIX A: STORAGE - Permitir ver contenido del feed
-- ============================================

-- Eliminar la política restrictiva actual que solo permite ver tu propio contenido
DROP POLICY IF EXISTS "Users can view accessible content" ON storage.objects;

-- Nueva política: todos los usuarios autenticados pueden VER el contenido del bucket 'content'
-- Esto permite que las imágenes de posts se muestren en el feed
CREATE POLICY "Authenticated users can view all content"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'content' 
  AND auth.uid() IS NOT NULL
);

-- ============================================
-- FIX B: COMMENTS - Permitir comentar sin ser amigo
-- ============================================

-- Eliminar la política restrictiva actual que requiere is_friend
DROP POLICY IF EXISTS "Parent approved friends can comment" ON public.comments;

-- Nueva política: usuarios con parent_approved pueden comentar en cualquier post existente
-- (sin restricción de amistad para el MVP)
CREATE POLICY "Parent approved users can comment"
ON public.comments FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND NOT is_blocked_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.parent_approved = true
  )
  AND EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = comments.post_id
  )
);