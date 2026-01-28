import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Ready Player Me Avatar Data stored in profiles.avatar_data
 */
export interface ReadyPlayerMeAvatarData {
  provider: 'readyplayerme';
  avatar_id: string;
  model_url: string;
}

export interface AvatarItem {
  id: string;
  name: string;
  category: string;
  rarity: string;
  allowed_ages: string[];
  asset_data: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  avatar_item_id: string;
  unlocked_at: string;
  source: string;
  avatar_item?: AvatarItem;
}

export function useAvatar() {
  const { user, profile, refreshProfile } = useAuth();
  const [avatarItems, setAvatarItems] = useState<AvatarItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  // Check if user has a configured avatar (Ready Player Me)
  const hasAvatar = !!(profile?.avatar_snapshot_url);
  const avatarUrl = profile?.avatar_snapshot_url || null;
  const avatarData = profile?.avatar_data as Record<string, unknown> | null;
  
  // Ready Player Me specific data
  const avatarId = (avatarData?.avatar_id as string) || null;
  const modelUrl = (avatarData?.model_url as string) || null;

  // Fetch available avatar items (for unlockables system)
  const fetchAvatarItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('avatar_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      const items = (data || []).map(item => ({
        ...item,
        asset_data: item.asset_data as Record<string, unknown>,
      })) as AvatarItem[];
      setAvatarItems(items);
    } catch (error) {
      console.error('Error fetching avatar items:', error);
    }
  }, []);

  // Fetch user's inventory
  const fetchInventory = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          *,
          avatar_item:avatar_items(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      const items = (data || []).map(item => ({
        ...item,
        avatar_item: item.avatar_item ? {
          ...item.avatar_item,
          asset_data: item.avatar_item.asset_data as Record<string, unknown>,
        } : undefined,
      })) as InventoryItem[];
      setInventory(items);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  }, [user]);

  // Load items and inventory on mount
  useEffect(() => {
    const load = async () => {
      setIsLoadingItems(true);
      await Promise.all([fetchAvatarItems(), fetchInventory()]);
      setIsLoadingItems(false);
    };
    load();
  }, [fetchAvatarItems, fetchInventory]);

  // Check if user owns an item
  const ownsItem = useCallback((itemId: string): boolean => {
    return inventory.some(inv => inv.avatar_item_id === itemId);
  }, [inventory]);

  // Get items by category
  const getItemsByCategory = useCallback((category: string): AvatarItem[] => {
    return avatarItems.filter(item => item.category === category);
  }, [avatarItems]);

  // Get owned items by category
  const getOwnedItemsByCategory = useCallback((category: string): AvatarItem[] => {
    return avatarItems.filter(item => 
      item.category === category && 
      (item.is_default || ownsItem(item.id))
    );
  }, [avatarItems, ownsItem]);

  // Save Ready Player Me avatar (called from CreateAvatarPage/EditAvatarPage)
  const saveReadyPlayerMeAvatar = useCallback(async (
    modelUrl: string, 
    snapshotUrl: string, 
    avatarId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_snapshot_url: snapshotUrl,
          avatar_data: { 
            provider: 'readyplayerme',
            model_url: modelUrl,
            avatar_id: avatarId
          }
        })
        .eq('id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshProfile();
      return { success: true };
    } catch (error) {
      console.error('Error saving avatar:', error);
      return { success: false, error: 'Error guardando avatar' };
    }
  }, [user, refreshProfile]);

  return {
    // State
    hasAvatar,
    avatarUrl,
    avatarId,
    modelUrl,
    avatarItems,
    inventory,
    isLoadingItems,
    
    // Actions
    saveReadyPlayerMeAvatar,
    fetchInventory,
    
    // Helpers
    ownsItem,
    getItemsByCategory,
    getOwnedItemsByCategory,
  };
}
