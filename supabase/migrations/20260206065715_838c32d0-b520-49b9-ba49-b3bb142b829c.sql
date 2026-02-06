-- FIX: Ajustar policy INSERT de posts para permitir crear a usuarios autenticados
-- La validación de permisos (canInteract, parent_approved) ya se hace en frontend

-- Eliminar la policy restrictiva actual
DROP POLICY IF EXISTS "Active users can create posts" ON public.posts;

-- Crear policy INSERT más simple: solo verificar que author_id = auth.uid()
-- y que no esté bloqueado por infracciones
CREATE POLICY "Authenticated users can create posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() 
  AND NOT is_blocked_user(auth.uid())
);