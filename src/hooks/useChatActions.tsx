import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useChatActions() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const muteChat = useCallback(async (chatId: string, muted: boolean) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      // Try to update existing setting
      const { data: existing } = await supabase
        .from('conversation_settings')
        .select('id')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('conversation_settings')
          .update({ muted, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('conversation_settings')
          .insert({
            chat_id: chatId,
            user_id: user.id,
            muted
          });

        if (error) throw error;
      }

      toast.success(muted ? 'Chat silenciado' : 'Chat desilenciado');
      return { error: null };
    } catch (error) {
      console.error('Error muting chat:', error);
      toast.error('Error al silenciar chat');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const blockUser = useCallback(async (blockedUserId: string) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Usuario ya bloqueado');
          return { error: null };
        }
        throw error;
      }

      toast.success('Usuario bloqueado');
      return { error: null };
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Error al bloquear usuario');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const unblockUser = useCallback(async (blockedUserId: string) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;

      toast.success('Usuario desbloqueado');
      return { error: null };
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Error al desbloquear usuario');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const reportUser = useCallback(async (reportedUserId: string, chatId?: string, messageId?: string, reason?: string) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          reported_chat_id: chatId || null,
          reported_message_id: messageId || null,
          reason: reason || 'Comportamiento inapropiado'
        });

      if (error) throw error;

      toast.success('Reporte enviado. Gracias por ayudarnos a mantener la comunidad segura.');
      return { error: null };
    } catch (error) {
      console.error('Error reporting user:', error);
      toast.error('Error al enviar reporte');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getChatSettings = useCallback(async (chatId: string) => {
    if (!user) return null;

    try {
      const { data } = await supabase
        .from('conversation_settings')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .maybeSingle();

      return data;
    } catch (error) {
      console.error('Error getting chat settings:', error);
      return null;
    }
  }, [user]);

  const isUserBlocked = useCallback(async (userId: string) => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking block status:', error);
      return false;
    }
  }, [user]);

  return {
    muteChat,
    blockUser,
    unblockUser,
    reportUser,
    getChatSettings,
    isUserBlocked,
    isLoading
  };
}
