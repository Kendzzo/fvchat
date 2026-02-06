-- =========================================
-- 0) PRECHECK: asegurar extensiones comunes
-- =========================================
create extension if not exists "pgcrypto";

-- =========================================
-- 1) FIX TIPOS: user_stickers.user_id DEBE SER uuid
-- =========================================

-- 1.1) Dropear policies que dependan de user_id en user_stickers (para permitir ALTER TYPE)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_stickers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_stickers;', r.policyname);
  END LOOP;
END $$;

-- 1.2) Desactivar RLS temporalmente para migrar tipo
ALTER TABLE public.user_stickers DISABLE ROW LEVEL SECURITY;

-- 1.3) Limpiar filas con user_id no-uuid antes de convertir
DELETE FROM public.user_stickers
WHERE user_id IS NULL
   OR user_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 1.4) Convertir user_id a uuid (si ya es uuid, no pasa nada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_stickers' AND column_name = 'user_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.user_stickers ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
  END IF;
END $$;

-- 1.5) Reactivar RLS
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;

-- 1.6) Re-crear policies MINIMAS correctas para user_stickers
DROP POLICY IF EXISTS user_stickers_select_own ON public.user_stickers;
CREATE POLICY user_stickers_select_own
ON public.user_stickers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_stickers_insert_own ON public.user_stickers;
CREATE POLICY user_stickers_insert_own
ON public.user_stickers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_stickers_delete_own ON public.user_stickers;
CREATE POLICY user_stickers_delete_own
ON public.user_stickers
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =========================================
-- 2) POSTS: policies mínimas para que crear/leer funcione
-- =========================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Limpia policies previas para evitar conflictos
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'posts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.posts;', r.policyname);
  END LOOP;
END $$;

-- SELECT: usuarios autenticados pueden ver posts
CREATE POLICY posts_select_auth
ON public.posts
FOR SELECT
TO authenticated
USING (true);

-- INSERT: solo si author_id = auth.uid()
CREATE POLICY posts_insert_own
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

-- UPDATE/DELETE: solo owner
CREATE POLICY posts_update_own
ON public.posts
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY posts_delete_own
ON public.posts
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- =========================================
-- 3) CHATS: permitir leer chats donde participas
-- =========================================
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chats'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chats;', r.policyname);
  END LOOP;
END $$;

CREATE POLICY chats_select_participant
ON public.chats
FOR SELECT
TO authenticated
USING (auth.uid() = ANY (participant_ids));

CREATE POLICY chats_insert_creator
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

-- =========================================
-- 4) MESSAGES: permitir insertar/leer mensajes en chats donde participas
-- =========================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages;', r.policyname);
  END LOOP;
END $$;

-- SELECT: solo mensajes de chats donde participas
CREATE POLICY messages_select_participant
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chats c
    WHERE c.id = messages.chat_id
      AND auth.uid() = ANY (c.participant_ids)
  )
);

-- INSERT: solo si sender_id=auth.uid() y eres participante del chat
CREATE POLICY messages_insert_participant
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.chats c
    WHERE c.id = messages.chat_id
      AND auth.uid() = ANY (c.participant_ids)
  )
);

-- UPDATE: permitir que el emisor actualice su propio mensaje
CREATE POLICY messages_update_own
ON public.messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- DELETE: solo emisor
CREATE POLICY messages_delete_own
ON public.messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());