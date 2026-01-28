import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // Get all chats where user is a participant
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id')
        .contains('participant_ids', [user.id]);

      if (chatsError) {
        console.error('Error fetching chats:', chatsError);
        return;
      }

      if (!chats || chats.length === 0) {
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const chatIds = chats.map(c => c.id);

      // Get all messages in those chats that are not from the user
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .in('chat_id', chatIds)
        .neq('sender_id', user.id);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      if (!messages || messages.length === 0) {
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const messageIds = messages.map(m => m.id);

      // Get read receipts for those messages by the current user
      const { data: reads, error: readsError } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds);

      if (readsError) {
        console.error('Error fetching reads:', readsError);
        return;
      }

      const readMessageIds = new Set(reads?.map(r => r.message_id) || []);
      const unread = messageIds.filter(id => !readMessageIds.has(id));

      setUnreadCount(unread.length);
    } catch (error) {
      console.error('Error calculating unread count:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markChatAsRead = useCallback(async (chatId: string) => {
    if (!user) return;

    try {
      // Get all messages in this chat not from the user
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
        .neq('sender_id', user.id);

      if (messagesError || !messages) return;

      // Get existing reads
      const messageIds = messages.map(m => m.id);
      const { data: existingReads } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds);

      const existingReadIds = new Set(existingReads?.map(r => r.message_id) || []);
      const unreadMessageIds = messageIds.filter(id => !existingReadIds.has(id));

      if (unreadMessageIds.length === 0) return;

      // Insert read receipts for unread messages
      const readsToInsert = unreadMessageIds.map(messageId => ({
        message_id: messageId,
        user_id: user.id,
      }));

      await supabase.from('message_reads').insert(readsToInsert);

      // Refresh count
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadCount]);

  return {
    unreadCount,
    isLoading,
    markChatAsRead,
    refreshUnreadCount: fetchUnreadCount
  };
}
