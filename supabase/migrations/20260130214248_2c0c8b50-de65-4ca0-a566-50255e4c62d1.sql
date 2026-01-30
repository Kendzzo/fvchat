-- Tabla para tokens de acceso del tutor (links seguros)
CREATE TABLE public.tutor_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NULL,
  is_revoked boolean NOT NULL DEFAULT false
);

-- Índice para búsquedas por email
CREATE INDEX idx_tutor_access_tokens_email ON public.tutor_access_tokens(tutor_email);

-- Índice para búsquedas por hash
CREATE INDEX idx_tutor_access_tokens_hash ON public.tutor_access_tokens(token_hash);

-- Tabla para vincular tutores con niños (histórico)
CREATE TABLE public.tutor_child_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_email text NOT NULL,
  child_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tutor_email, child_user_id)
);

-- Índice para búsquedas
CREATE INDEX idx_tutor_child_links_email ON public.tutor_child_links(tutor_email);
CREATE INDEX idx_tutor_child_links_child ON public.tutor_child_links(child_user_id);

-- Habilitar RLS
ALTER TABLE public.tutor_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_child_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies para tutor_access_tokens
-- Solo admins pueden ver/gestionar tokens (el acceso normal es via Edge Functions)
CREATE POLICY "Admins can manage tutor access tokens"
ON public.tutor_access_tokens
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para tutor_child_links
-- Solo admins pueden ver/gestionar links (el acceso normal es via Edge Functions)
CREATE POLICY "Admins can manage tutor child links"
ON public.tutor_child_links
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));