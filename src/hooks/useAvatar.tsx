import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AvatarConfig {
  hair: { type: string; color: string };
  face: { shape: string };
  eyes: { type: string; color: string };
  skin: { tone: string };
  top: { type: string; color: string };
  bottom: { type: string; color: string };
  shoes: { type: string; color: string };
  accessory: { type: string; color?: string };
  pose: { pose: string };
  expression: { expression: string };
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

const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  hair: { type: 'short', color: 'brown' },
  face: { shape: 'round' },
  eyes: { type: 'normal', color: 'brown' },
  skin: { tone: 'medium' },
  top: { type: 'tshirt', color: 'blue' },
  bottom: { type: 'jeans', color: 'blue' },
  shoes: { type: 'sneakers', color: 'white' },
  accessory: { type: 'none' },
  pose: { pose: 'idle' },
  expression: { expression: 'happy' },
};

export function useAvatar() {
  const { user, profile, refreshProfile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [avatarItems, setAvatarItems] = useState<AvatarItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  // Check if user has a configured avatar
  const hasAvatar = !!(profile?.avatar_snapshot_url);
  const avatarUrl = profile?.avatar_snapshot_url || null;
  const avatarData = profile?.avatar_data as Record<string, unknown> | undefined;
  const currentConfig: AvatarConfig = avatarData && 'hair' in avatarData 
    ? avatarData as unknown as AvatarConfig 
    : DEFAULT_AVATAR_CONFIG;

  // Fetch available avatar items
  const fetchAvatarItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('avatar_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      // Cast data to our interface type
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
      // Cast data to our interface type
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

  // Generate avatar with AI
  const generateAvatar = useCallback(async (config: AvatarConfig): Promise<{ 
    success: boolean; 
    avatarUrl?: string; 
    error?: string 
  }> => {
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    setIsGenerating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        return { success: false, error: 'Sesión expirada' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ avatar_config: config }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Error generando avatar' };
      }

      // Refresh profile to get updated avatar
      await refreshProfile();

      return { 
        success: true, 
        avatarUrl: result.avatar_url 
      };
    } catch (error) {
      console.error('Error generating avatar:', error);
      return { 
        success: false, 
        error: 'Error de conexión. Inténtalo de nuevo.' 
      };
    } finally {
      setIsGenerating(false);
    }
  }, [user, refreshProfile]);

  // Grant default items to user (called after registration)
  const grantDefaultItems = useCallback(async () => {
    if (!user) return;

    try {
      // This is handled by the database trigger, but we can manually call it
      const defaultItems = avatarItems.filter(item => item.is_default);
      
      for (const item of defaultItems) {
        if (!ownsItem(item.id)) {
          await supabase.from('user_inventory').insert({
            user_id: user.id,
            avatar_item_id: item.id,
            source: 'default',
          });
        }
      }

      await fetchInventory();
    } catch (error) {
      console.error('Error granting default items:', error);
    }
  }, [user, avatarItems, ownsItem, fetchInventory]);

  return {
    // State
    hasAvatar,
    avatarUrl,
    currentConfig,
    isGenerating,
    avatarItems,
    inventory,
    isLoadingItems,
    
    // Actions
    generateAvatar,
    fetchInventory,
    grantDefaultItems,
    
    // Helpers
    ownsItem,
    getItemsByCategory,
    getOwnedItemsByCategory,
    
    // Constants
    DEFAULT_AVATAR_CONFIG,
  };
}
