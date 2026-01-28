import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Sticker {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic';
  category: string;
  image_url: string;
  prompt: string | null;
  created_at: string;
}

export interface UserSticker {
  id: string;
  user_id: string;
  sticker_id: string;
  unlocked_at: string;
  source: string;
  sticker?: Sticker;
}

export interface PostSticker {
  id: string;
  post_id: string;
  sticker_id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  created_at: string;
  sticker?: Sticker;
}

export function useStickers() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<Sticker[]>([]);
  const [userStickers, setUserStickers] = useState<UserSticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all stickers from catalog
  const fetchCatalog = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .order('rarity', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setCatalog((data || []) as Sticker[]);
    } catch (err) {
      console.error('Error fetching sticker catalog:', err);
    }
  }, []);

  // Fetch user's unlocked stickers
  const fetchUserStickers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_stickers')
        .select(`
          *,
          sticker:stickers(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setUserStickers((data || []) as UserSticker[]);
    } catch (err) {
      console.error('Error fetching user stickers:', err);
    }
  }, [user]);

  // Unlock a sticker for the current user
  const unlockSticker = useCallback(async (stickerId: string, source: string = 'manual') => {
    if (!user) return { error: new Error('No autenticado') };

    try {
      const { error } = await supabase
        .from('user_stickers')
        .insert({
          user_id: user.id,
          sticker_id: stickerId,
          source
        });

      if (error) {
        if (error.code === '23505') {
          return { error: new Error('Ya tienes este sticker') };
        }
        throw error;
      }

      await fetchUserStickers();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [user, fetchUserStickers]);

  // Check if user owns a sticker
  const ownsSticker = useCallback((stickerId: string): boolean => {
    return userStickers.some(us => us.sticker_id === stickerId);
  }, [userStickers]);

  // Get stickers by category
  const getStickersByCategory = useCallback((category: string): Sticker[] => {
    return catalog.filter(s => s.category === category);
  }, [catalog]);

  // Get stickers by rarity
  const getStickersByRarity = useCallback((rarity: Sticker['rarity']): Sticker[] => {
    return catalog.filter(s => s.rarity === rarity);
  }, [catalog]);

  // Get user's owned stickers with full sticker data
  const getOwnedStickers = useCallback((): Sticker[] => {
    return userStickers
      .map(us => us.sticker)
      .filter((s): s is Sticker => !!s);
  }, [userStickers]);

  // Fetch post stickers for a specific post
  const fetchPostStickers = useCallback(async (postId: string): Promise<PostSticker[]> => {
    try {
      const { data, error } = await supabase
        .from('post_stickers')
        .select(`
          *,
          sticker:stickers(*)
        `)
        .eq('post_id', postId);

      if (error) throw error;
      return (data || []) as PostSticker[];
    } catch (err) {
      console.error('Error fetching post stickers:', err);
      return [];
    }
  }, []);

  // Add sticker to a post
  const addStickerToPost = useCallback(async (
    postId: string,
    stickerId: string,
    position: { x: number; y: number; scale: number; rotation: number }
  ) => {
    try {
      const { error } = await supabase
        .from('post_stickers')
        .insert({
          post_id: postId,
          sticker_id: stickerId,
          x: position.x,
          y: position.y,
          scale: position.scale,
          rotation: position.rotation
        });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  // Remove sticker from a post
  const removeStickerFromPost = useCallback(async (postStickerId: string) => {
    try {
      const { error } = await supabase
        .from('post_stickers')
        .delete()
        .eq('id', postStickerId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchCatalog(), fetchUserStickers()]);
      setIsLoading(false);
    };
    load();
  }, [fetchCatalog, fetchUserStickers]);

  return {
    // State
    catalog,
    userStickers,
    isLoading,

    // Actions
    fetchCatalog,
    fetchUserStickers,
    unlockSticker,
    fetchPostStickers,
    addStickerToPost,
    removeStickerFromPost,

    // Helpers
    ownsSticker,
    getStickersByCategory,
    getStickersByRarity,
    getOwnedStickers,
  };
}
