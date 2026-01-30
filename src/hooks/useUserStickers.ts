import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserStickerItem {
  id: string;
  sticker_id: string;
  name: string;
  image_url: string;
  rarity: string;
  category: string;
  unlocked_at: string;
}

export function useUserStickers() {
  const { user } = useAuth();
  const [stickers, setStickers] = useState<UserStickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasAssignedStarters = useRef(false);

  const fetchUserStickers = useCallback(async () => {
    if (!user) {
      setStickers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_stickers')
        .select(`
          id,
          sticker_id,
          unlocked_at,
          sticker:stickers(id, name, image_url, rarity, category)
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Flatten the data
      const flatStickers: UserStickerItem[] = (data || []).map((item: any) => ({
        id: item.id,
        sticker_id: item.sticker_id,
        name: item.sticker?.name || 'Sticker',
        image_url: item.sticker?.image_url || '',
        rarity: item.sticker?.rarity || 'common',
        category: item.sticker?.category || 'general',
        unlocked_at: item.unlocked_at,
      }));

      setStickers(flatStickers);
      setError(null);
    } catch (err) {
      console.error('Error fetching user stickers:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Assign starter stickers for new users
  const assignStarterStickers = useCallback(async () => {
    if (!user || hasAssignedStarters.current) return;
    hasAssignedStarters.current = true;

    try {
      console.log('[useUserStickers] Checking/assigning starter stickers...');
      const { data, error } = await supabase.functions.invoke('assign-starter-stickers', {
        body: { user_id: user.id },
      });

      if (error) {
        console.error('[useUserStickers] Error assigning starter stickers:', error);
        return;
      }

      console.log('[useUserStickers] Starter stickers result:', data);
      
      // Refresh stickers if new ones were assigned
      if (data?.assigned > 0) {
        await fetchUserStickers();
      }
    } catch (err) {
      console.error('[useUserStickers] Error invoking assign-starter-stickers:', err);
    }
  }, [user, fetchUserStickers]);

  // Load stickers on mount
  useEffect(() => {
    fetchUserStickers();
  }, [fetchUserStickers]);

  // Assign starter stickers after initial load
  useEffect(() => {
    if (user && !isLoading && stickers.length === 0 && !hasAssignedStarters.current) {
      assignStarterStickers();
    }
  }, [user, isLoading, stickers.length, assignStarterStickers]);

  return {
    stickers,
    isLoading,
    error,
    refresh: fetchUserStickers,
  };
}
