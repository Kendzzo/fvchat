import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent concurrent fetches and debounce
  const fetchingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  const lastFetchRef = useRef(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }

    // Debounce: skip if fetched within last 2 seconds
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) {
      return;
    }

    fetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      // Get all chats where user is a participant
      const { data: chats, error: chatsError } = await supabase
        .from("chats")
        .select("id")
        .contains("participant_ids", [user.id]);

      if (chatsError) {
        console.error("Error fetching chats:", chatsError);
        return;
      }

      if (!chats || chats.length === 0) {
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const chatIds = chats.map((c) => c.id);

      // Get all messages in those chats that are not from the user
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("id")
        .in("chat_id", chatIds)
        .neq("sender_id", user.id);

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        return;
      }

      if (!messages || messages.length === 0) {
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const messageIds = messages.map((m) => m.id);

      // Get read receipts for those messages by the current user
      const { data: reads, error: readsError } = await supabase
        .from("message_reads")
        .select("message_id")
        .eq("user_id", user.id)
        .in("message_id", messageIds);

      if (readsError) {
        console.error("Error fetching reads:", readsError);
        return;
      }

      const readMessageIds = new Set(reads?.map((r) => r.message_id) || []);
      const unread = messageIds.filter((id) => !readMessageIds.has(id));

      setUnreadCount(unread.length);
    } catch (error) {
      console.error("Error calculating unread count:", error);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [user]);

  // Debounced version for realtime triggers
  const debouncedFetchUnreadCount = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      fetchUnreadCount();
    }, 500);
  }, [fetchUnreadCount]);

  const markChatAsRead = useCallback(
    async (chatId: string) => {
      if (!user) return;

      try {
        // Get all messages in this chat not from the user
        const { data: messages, error: messagesError } = await supabase
          .from("messages")
          .select("id")
          .eq("chat_id", chatId)
          .neq("sender_id", user.id);

        if (messagesError || !messages) return;

        // Get existing reads
        const messageIds = messages.map((m) => m.id);
        if (messageIds.length === 0) {
          // No messages from others = nothing to mark, but ensure count is 0 for this chat
          return;
        }

        const { data: existingReads } = await supabase
          .from("message_reads")
          .select("message_id")
          .eq("user_id", user.id)
          .in("message_id", messageIds);

        const existingReadIds = new Set(existingReads?.map((r) => r.message_id) || []);
        const unreadMessageIds = messageIds.filter((id) => !existingReadIds.has(id));

        if (unreadMessageIds.length === 0) return;

        // Insert read receipts for unread messages
        const readsToInsert = unreadMessageIds.map((messageId) => ({
          message_id: messageId,
          user_id: user.id,
        }));

        const { error: insertError } = await supabase.from("message_reads").insert(readsToInsert);
        
        if (!insertError) {
          // FIX: Update count IMMEDIATELY (optimistic) and then verify with fetch
          setUnreadCount((prev) => Math.max(0, prev - unreadMessageIds.length));
          
          // Reset debounce to allow immediate fetch
          lastFetchRef.current = 0;
          
          // Then verify with actual fetch (delayed to avoid race)
          setTimeout(() => {
            fetchUnreadCount();
          }, 300);
        }
      } catch (error) {
        console.error("Error marking chat as read:", error);
      }
    },
    [user, fetchUnreadCount],
  );

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new messages only (not reads, to avoid loops)
    const channel = supabase
      .channel("unread-messages-v2")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Only trigger on messages from others
          debouncedFetchUnreadCount();
        },
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadCount, debouncedFetchUnreadCount]);

  return {
    unreadCount,
    isLoading,
    markChatAsRead,
    refreshUnreadCount: fetchUnreadCount,
  };
}
