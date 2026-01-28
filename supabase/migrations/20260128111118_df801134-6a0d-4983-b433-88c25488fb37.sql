-- Add avatar_snapshot_url to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_snapshot_url text;

-- Create avatar_items table for available cosmetic items
CREATE TABLE IF NOT EXISTS public.avatar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('hair', 'face', 'eyes', 'skin', 'top', 'bottom', 'shoes', 'accessory', 'pose', 'expression')),
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  allowed_ages text[] NOT NULL DEFAULT ARRAY['6-8', '9-12', '13-16'],
  asset_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_inventory table for owned items
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar_item_id uuid NOT NULL REFERENCES public.avatar_items(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'default' CHECK (source IN ('default', 'challenge', 'reward', 'admin')),
  UNIQUE(user_id, avatar_item_id)
);

-- Enable RLS
ALTER TABLE public.avatar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- RLS for avatar_items: anyone can view active items
CREATE POLICY "Anyone can view active avatar items"
ON public.avatar_items FOR SELECT
USING (is_active = true);

-- Admins can manage all avatar items
CREATE POLICY "Admins can manage avatar items"
ON public.avatar_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for user_inventory: users can view their own inventory
CREATE POLICY "Users can view their own inventory"
ON public.user_inventory FOR SELECT
USING (user_id = auth.uid());

-- Users can insert to their own inventory (for system grants)
CREATE POLICY "System can grant inventory items"
ON public.user_inventory FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can manage all inventories
CREATE POLICY "Admins can manage all inventories"
ON public.user_inventory FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default avatar items (basic free items)
INSERT INTO public.avatar_items (name, category, rarity, is_default, asset_data) VALUES
-- Hair styles
('Pelo Corto', 'hair', 'common', true, '{"type": "short", "colors": ["brown", "black", "blonde", "red", "blue", "green", "purple", "pink"]}'::jsonb),
('Pelo Largo', 'hair', 'common', true, '{"type": "long", "colors": ["brown", "black", "blonde", "red", "blue", "green", "purple", "pink"]}'::jsonb),
('Pelo Rizado', 'hair', 'common', true, '{"type": "curly", "colors": ["brown", "black", "blonde", "red", "blue", "green", "purple", "pink"]}'::jsonb),
('Pelo Punk', 'hair', 'rare', false, '{"type": "punk", "colors": ["blue", "green", "purple", "pink", "red"]}'::jsonb),
-- Face shapes
('Cara Redonda', 'face', 'common', true, '{"shape": "round"}'::jsonb),
('Cara Ovalada', 'face', 'common', true, '{"shape": "oval"}'::jsonb),
('Cara Cuadrada', 'face', 'common', true, '{"shape": "square"}'::jsonb),
-- Eyes
('Ojos Normales', 'eyes', 'common', true, '{"type": "normal", "colors": ["brown", "blue", "green", "hazel", "gray"]}'::jsonb),
('Ojos Grandes', 'eyes', 'common', true, '{"type": "big", "colors": ["brown", "blue", "green", "hazel", "gray"]}'::jsonb),
('Ojos Gato', 'eyes', 'rare', false, '{"type": "cat", "colors": ["yellow", "green", "purple"]}'::jsonb),
-- Skin tones
('Piel Clara', 'skin', 'common', true, '{"tone": "light"}'::jsonb),
('Piel Media', 'skin', 'common', true, '{"tone": "medium"}'::jsonb),
('Piel Oscura', 'skin', 'common', true, '{"tone": "dark"}'::jsonb),
('Piel Fantasia Azul', 'skin', 'epic', false, '{"tone": "fantasy-blue"}'::jsonb),
-- Tops
('Camiseta Básica', 'top', 'common', true, '{"type": "tshirt", "colors": ["white", "black", "red", "blue", "green", "yellow", "purple"]}'::jsonb),
('Sudadera', 'top', 'common', true, '{"type": "hoodie", "colors": ["gray", "black", "blue", "red", "green"]}'::jsonb),
('Camiseta Gaming', 'top', 'rare', false, '{"type": "gaming-tee", "colors": ["neon-green", "neon-purple", "neon-blue"]}'::jsonb),
-- Bottoms
('Pantalón Vaquero', 'bottom', 'common', true, '{"type": "jeans", "colors": ["blue", "black", "gray"]}'::jsonb),
('Pantalón Deportivo', 'bottom', 'common', true, '{"type": "joggers", "colors": ["black", "gray", "navy"]}'::jsonb),
-- Shoes
('Zapatillas Deportivas', 'shoes', 'common', true, '{"type": "sneakers", "colors": ["white", "black", "red", "blue"]}'::jsonb),
('Botas', 'shoes', 'rare', false, '{"type": "boots", "colors": ["black", "brown"]}'::jsonb),
-- Accessories
('Sin Accesorio', 'accessory', 'common', true, '{"type": "none"}'::jsonb),
('Gafas de Sol', 'accessory', 'rare', false, '{"type": "sunglasses", "colors": ["black", "gold", "silver"]}'::jsonb),
('Gorra Gaming', 'accessory', 'rare', false, '{"type": "gaming-cap", "colors": ["black", "purple", "green"]}'::jsonb),
('Auriculares RGB', 'accessory', 'epic', false, '{"type": "rgb-headphones", "colors": ["rainbow"]}'::jsonb),
-- Poses
('Pose Normal', 'pose', 'common', true, '{"pose": "idle"}'::jsonb),
('Pose Victoria', 'pose', 'rare', false, '{"pose": "victory"}'::jsonb),
('Pose Cool', 'pose', 'rare', false, '{"pose": "cool"}'::jsonb),
-- Expressions
('Neutral', 'expression', 'common', true, '{"expression": "neutral"}'::jsonb),
('Feliz', 'expression', 'common', true, '{"expression": "happy"}'::jsonb),
('Sorprendido', 'expression', 'common', true, '{"expression": "surprised"}'::jsonb),
('Enfadado', 'expression', 'rare', false, '{"expression": "angry"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Create function to grant default items to new users
CREATE OR REPLACE FUNCTION public.grant_default_avatar_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_inventory (user_id, avatar_item_id, source)
  SELECT NEW.id, ai.id, 'default'
  FROM public.avatar_items ai
  WHERE ai.is_default = true AND ai.is_active = true
  ON CONFLICT (user_id, avatar_item_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-grant default items on profile creation
DROP TRIGGER IF EXISTS grant_default_items_on_profile ON public.profiles;
CREATE TRIGGER grant_default_items_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_default_avatar_items();

-- Create function to grant challenge reward items
CREATE OR REPLACE FUNCTION public.grant_challenge_reward(
  _user_id uuid,
  _item_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_inventory (user_id, avatar_item_id, source)
  VALUES (_user_id, _item_id, 'challenge')
  ON CONFLICT (user_id, avatar_item_id) DO NOTHING;
  
  RETURN true;
END;
$$;