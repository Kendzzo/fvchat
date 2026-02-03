import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Chat {
  id: string;
  is_group: boolean;
  name: string | null;
  participant_ids: string[];
  created_by: string | null;
  created_at: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  otherParticipant?: {
    nick: string;
    profile_photo_url?: string | null;
    last_seen_at?: string | null;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  type: "text" | "photo" | "video" | "audio" | "image";
  content: string;
  is_blocked: boolean;
  sticker_id: string | null;
  created_at: string;
  sender?: {
    nick: string;
    avatar_data: Record<string, unknown>;
    profile_photo_url?: string | null;
  };
  sticker?: {
    id: string;
    name: string;
    image_url: string;
    rarity: string;
  } | null;
}

export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper: upsert chat locally (add or update, move to top)
  const upsertChatLocal = useCallback((newChat: Chat) => {
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== newChat.id);
      return [newChat, ...filtered];
    });
  }, []);

  // Helper: update last message for a chat and move it to top
  const applyLastMessage = useCallback(
    (chatId: string, content: string, created_at: string, senderId: string) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === chatId);
        if (idx === -1) return prev;

        const chat = prev[idx];
        const updatedChat: Chat = {
          ...chat,
          lastMessage: content,
          lastMessageTime: created_at,
          // Increment unread if message is from someone else
          unreadCount: senderId !== user?.id ? (chat.unreadCount || 0) + 1 : chat.unreadCount,
        };

        const filtered = prev.filter((c) => c.id !== chatId);
        return [updatedChat, ...filtered];
      });
    },
    [user?.id],
  );

  // Helper: mark a chat as read (reset unread count)
  const markChatAsReadLocal = useCallback((chatId: string) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  const fetchChats = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("chats")
        .select("*")
        .contains("participant_ids", [user.id])
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching chats:", fetchError);
        setError(fetchError.message);
        return;
      }

      const chatIds = (data || []).map((c) => c.id);
      if (chatIds.length === 0) {
        setChats([]);
        return;
      }

      // Batch fetch: last message for all chats in one query
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("chat_id, content, created_at")
        .in("chat_id", chatIds)
        .filter("is_hidden", "eq", false)
        .order("created_at", { ascending: false });

      // Group last messages by chat_id (first occurrence is the latest)
      const lastMessageByChat: Record<string, { content: string; created_at: string }> = {};
      for (const msg of lastMessages || []) {
        if (!lastMessageByChat[msg.chat_id]) {
          lastMessageByChat[msg.chat_id] = { content: msg.content, created_at: msg.created_at };
        }
      }

      // Batch fetch: other participants for 1-1 chats
      const otherUserIds = (data || [])
        .filter((c) => !c.is_group)
        .map((c) => c.participant_ids.find((id: string) => id !== user.id))
        .filter(Boolean) as string[];

      const { data: participants } =
        otherUserIds.length > 0
          ? await supabase.from("profiles").select("id, nick, profile_photo_url, last_seen_at").in("id", otherUserIds)
          : { data: [] };

      const participantById: Record<string, any> = {};
      for (const p of participants || []) {
        participantById[p.id] = p;
      }

      // Skip complex unread count calculation to avoid N+1 queries
      // Use a simpler approach: count messages not from self, created after last read
      // For now, set unreadCount to 0 to avoid blocking - can be optimized with a DB function later

      const chatsWithDetails: Chat[] = (data || []).map((chat) => {
        const lastMsg = lastMessageByChat[chat.id];
        const otherId = !chat.is_group ? chat.participant_ids.find((id: string) => id !== user.id) : null;
        const otherParticipant = otherId ? participantById[otherId] || null : null;

        return {
          ...chat,
          lastMessage: lastMsg?.content || "",
          lastMessageTime: lastMsg?.created_at || chat.created_at,
          unreadCount: 0, // Simplified - realtime will update this
          otherParticipant,
        } as Chat;
      });

      // Sort by lastMessageTime descending
      chatsWithDetails.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || a.created_at).getTime();
        const timeB = new Date(b.lastMessageTime || b.created_at).getTime();
        return timeB - timeA;
      });

      setChats(chatsWithDetails);
    } catch (err) {
      console.error("Error:", err);
      setError("Error al cargar chats");
    } finally {
      setIsLoading(false);
    }
  };

  const createChat = async (participantIds: string[], isGroup: boolean = false, name?: string) => {
    if (!user) return { error: new Error("No autenticado"), data: null };

    try {
      const allParticipants = [...new Set([user.id, ...participantIds])];

      const { data, error: insertError } = await supabase
        .from("chats")
        .insert({
          participant_ids: allParticipants,
          is_group: isGroup,
          name: name || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        return { error: new Error(insertError.message), data: null };
      }

      // Fetch other participant info for immediate display
      let otherParticipant = null;
      if (!isGroup && participantIds.length === 1) {
        const { data: participantData } = await supabase
          .from("profiles")
          .select("nick, profile_photo_url, last_seen_at")
          .eq("id", participantIds[0])
          .maybeSingle();
        otherParticipant = participantData;
      }

      // Create complete Chat object
      const newChat: Chat = {
        ...data,
        lastMessage: "",
        lastMessageTime: data.created_at,
        unreadCount: 0,
        otherParticipant,
      };

      // Add to local state immediately (optimistic update)
      upsertChatLocal(newChat);

      return { data: newChat, error: null };
    } catch (err) {
      return { error: err as Error, data: null };
    }
  };

  useEffect(() => {
    fetchChats();

    if (!user) return;

    // Subscribe to chat and message changes with proper handlers
    const channel = supabase
      .channel("chats-realtime-v2")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
        },
        async (payload) => {
          const newChatRaw = payload.new as any;
          // Only add if user is a participant and chat doesn't exist locally
          if (newChatRaw.participant_ids?.includes(user.id)) {
            // Check if we already have this chat
            setChats((prev) => {
              if (prev.some((c) => c.id === newChatRaw.id)) {
                return prev; // Already exists, skip
              }
              // We need to fetch full details, so trigger a refetch for this specific chat
              return prev;
            });
            // Fetch the full chat details
            const otherId = newChatRaw.participant_ids.find((id: string) => id !== user.id);
            let otherParticipant = null;
            if (otherId && !newChatRaw.is_group) {
              const { data: participantData } = await supabase
                .from("profiles")
                .select("nick, profile_photo_url, last_seen_at")
                .eq("id", otherId)
                .maybeSingle();
              otherParticipant = participantData;
            }
            const fullChat: Chat = {
              id: newChatRaw.id,
              is_group: newChatRaw.is_group,
              name: newChatRaw.name,
              participant_ids: newChatRaw.participant_ids,
              created_by: newChatRaw.created_by,
              created_at: newChatRaw.created_at,
              lastMessage: "",
              lastMessageTime: newChatRaw.created_at,
              unreadCount: 0,
              otherParticipant,
            };
            upsertChatLocal(fullChat);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as any;
          const chatId = newMessage.chat_id;
          const content = newMessage.content;
          const created_at = newMessage.created_at;
          const senderId = newMessage.sender_id;

          // Check if we have this chat in our state
          setChats((prev) => {
            const chatExists = prev.some((c) => c.id === chatId);
            if (chatExists) {
              // Update last message and move to top
              const idx = prev.findIndex((c) => c.id === chatId);
              const chat = prev[idx];
              const updatedChat: Chat = {
                ...chat,
                lastMessage: content,
                lastMessageTime: created_at,
                unreadCount: senderId !== user.id ? (chat.unreadCount || 0) + 1 : chat.unreadCount,
              };
              const filtered = prev.filter((c) => c.id !== chatId);
              return [updatedChat, ...filtered];
            } else {
              // Chat doesn't exist, we need to fetch it
              // This will be handled by a separate effect
              return prev;
            }
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reads",
        },
        () => {
          // When a message is marked as read, we could update counts
          // but for simplicity, we'll rely on markChatAsReadLocal being called
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, upsertChatLocal]);

  return {
    chats,
    isLoading,
    error,
    createChat,
    upsertChatLocal,
    markChatAsReadLocal,
    refreshChats: fetchChats,
  };
}

export function useMessages(chatId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = async () => {
    if (!chatId || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("[useMessages] Fetching messages for chat:", chatId);
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(nick, avatar_data, profile_photo_url),
          sticker:stickers(id, name, image_url, rarity)
        `,
        )
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[useMessages] Error fetching messages:", error);
        return;
      }

      console.log("[useMessages] Fetched", data?.length || 0, "messages");
      setMessages(data as Message[]);
    } catch (err) {
      console.error("[useMessages] Exception:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimistic message sending using Edge Function for guaranteed DB insert
  const sendMessage = async (
    content: string,
    type: Message["type"] = "text",
    stickerId?: string,
  ): Promise<{ data?: Message; error: Error | null }> => {
    console.log("[SEND] Start", {
      chatId,
      type,
      hasContent: !!content,
      stickerId: stickerId || null,
    });
    if (!user || !chatId) {
      console.error("[sendMessage] No user or chatId");
      return { error: new Error("No autenticado o chat no seleccionado") };
    }

    // Generate client temp ID for reconciliation
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log("[sendMessage] Starting:", {
      chatId,
      contentPreview: content.slice(0, 40),
      type,
      stickerId: !!stickerId,
      tempId,
    });

    // Create optimistic message for instant UI feedback
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      type,
      content,
      is_blocked: false,
      sticker_id: stickerId || null,
      created_at: new Date().toISOString(),
      sender: {
        nick: "Tú",
        avatar_data: {},
        profile_photo_url: null,
      },
      sticker: null,
    };

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    console.log("[sendMessage] Optimistic added:", tempId);

    try {
      // Get auth token
      console.log("[SEND] Getting session token...");
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("[SEND] Token exists:", !!sessionData.session?.access_token);
      const token = sessionData.session?.access_token;

      if (!token) {
        console.error("[sendMessage] No auth token");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return { error: new Error("Sesión expirada") };
      }

      // Map type for stickers
      let contentType = type;
      let contentUrl: string | undefined;
      let contentText: string | undefined;

      if (stickerId) {
        contentType = "image"; // stickers sent as image with sticker_id
        contentUrl = content;
      } else if (type === "text") {
        contentText = content;
      } else {
        contentUrl = content;
      }

      // Call Edge Function for guaranteed DB insert
      console.log("[sendMessage] Calling chat-send-message Edge Function...");

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-send-message`;
      console.log("📡 [SEND][4] Edge URL:", fnUrl);

      const t0 = performance.now();

      const response = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chat_id: chatId,
          client_temp_id: tempId,
          content_type: stickerId ? "sticker" : contentType,
          content_text: contentText,
          content_url: contentUrl,
          sticker_id: stickerId || undefined,
        }),
      });

      const t1 = performance.now();
      console.log("📡 [SEND][4] Response status:", response.status);
      console.log("📡 [SEND][4] Response ok:", response.ok);
      console.log("⏱️ [SEND][4] ms:", Math.round(t1 - t0));

      let result: any = null;
      try {
        result = await response.json();
      } catch (e) {
        console.error("📡 [SEND][4] Response JSON parse failed", e);
      }

      console.log("📡 [SEND][4] Response body:", result);

      if (!response.ok || !result?.ok) {
        console.error("[sendMessage][EDGE_FUNCTION_FAIL]", {
          status: response.status,
          error: result?.error,
          details: result?.details,
        });

        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return { error: new Error(result?.error || "Error al enviar mensaje") };
      }

      console.log("[sendMessage][EDGE_FUNCTION_OK]", result.message?.id);

      // Replace optimistic message with real one from server
      const realMessage = result.message as Message;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...realMessage,
                sender: optimisticMessage.sender, // Keep our sender info for display
                sticker: optimisticMessage.sticker,
              }
            : m,
        ),
      );

      return { data: realMessage, error: null };
    } catch (err) {
      console.error("[sendMessage][EXCEPTION]", err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return { error: err as Error };
    }
  };

  const sendSticker = async (stickerId: string, stickerUrl: string) => {
    console.log("[sendSticker] Sending sticker:", stickerId, stickerUrl);
    // For stickers, we use 'image' type and pass the sticker URL as content
    return sendMessage(stickerUrl, "image", stickerId);
  };

  useEffect(() => {
    if (!chatId || !user) return;
    fetchMessages();

    console.log("[useMessages] Setting up realtime subscription for chat:", chatId);

    // Subscribe to new messages for this chat
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessageRaw = payload.new as any;
          console.log("[useMessages] Realtime INSERT received:", newMessageRaw.id);

          // Only add if not already present (avoid duplicates from optimistic updates)
          setMessages((prev) => {
            // Check if this message already exists (by id or if it matches our temp message)
            const existsById = prev.some((m) => m.id === newMessageRaw.id);
            const matchesTempMessage = prev.some(
              (m) =>
                m.id.startsWith("temp-") &&
                m.sender_id === newMessageRaw.sender_id &&
                m.content === newMessageRaw.content &&
                m.type === newMessageRaw.type,
            );

            if (existsById) {
              console.log("[useMessages] Message already exists by ID, skipping");
              return prev;
            }

            if (matchesTempMessage) {
              // Replace the temp message with the real one
              console.log("[useMessages] Replacing temp message with real one");
              return prev.map((m) => {
                if (
                  m.id.startsWith("temp-") &&
                  m.sender_id === newMessageRaw.sender_id &&
                  m.content === newMessageRaw.content
                ) {
                  return { ...newMessageRaw, sender: m.sender, sticker: m.sticker } as Message;
                }
                return m;
              });
            }

            // New message from someone else - add it
            console.log("[useMessages] Adding new message from realtime");
            return [...prev, newMessageRaw as Message];
          });
        },
      )
      .subscribe((status) => {
        console.log("[useMessages] Subscription status:", status);
      });

    return () => {
      console.log("[useMessages] Cleaning up subscription for chat:", chatId);
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  return {
    messages,
    isLoading,
    sendMessage,
    sendSticker,
    refreshMessages: fetchMessages,
  };
}
