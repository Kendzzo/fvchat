import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface UserSettings {
  id: string;
  user_id: string;
  notify_likes: boolean;
  notify_comments: boolean;
  notify_messages: boolean;
  notify_challenges: boolean;
  post_visibility: 'everyone' | 'friends';
  message_permission: 'everyone' | 'friends';
  created_at: string;
  updated_at: string;
}

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to fetch existing settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            notify_likes: true,
            notify_comments: true,
            notify_messages: true,
            notify_challenges: true,
            post_visibility: 'friends',
            message_permission: 'friends'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating settings:', insertError);
        } else {
          setSettings(newSettings as UserSettings);
        }
      }
    } catch (err) {
      console.error('Error in fetchSettings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const updateSettings = async (updates: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user || !settings) return { error: new Error('No user or settings') };

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron guardar los ajustes',
          variant: 'destructive'
        });
        return { error };
      }

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: 'Guardado',
        description: 'Ajustes actualizados correctamente'
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    refreshSettings: fetchSettings
  };
}
