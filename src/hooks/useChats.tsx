import { useState, useEffect } from "react";
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

  // Add a new chat to local state immediately (optimistic update)
  const addChatToState = (newChat: Chat) => {
    setChats((prev) => {
      // Avoid duplicates
      if (prev.some((c) => c.id === newChat.id)) return prev;
      return [newChat, ...prev];
    });
  };

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

      // Fetch last message and participant info for each chat
      const chatsWithDetails = await Promise.all(
        (data || []).map(async (chat) => {
          // Get last message
          const { data: messages } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1);

          // Get other participant for 1-1 chats
          let otherParticipant = null;
          if (!chat.is_group) {
            const otherId = chat.participant_ids.find((id: string) => id !== user.id);
            if (otherId) {
              const { data: participantData } = await supabase
                .from("profiles")
                .select("nick, profile_photo_url, last_seen_at")
                .eq("id", otherId)
                .maybeSingle();
              otherParticipant = participantData;
            }
          }

          return {
            ...chat,
            lastMessage: messages?.[0]?.content || "",
            lastMessageTime: messages?.[0]?.created_at || chat.created_at,
            unreadCount: 0, // TODO: Implement unread count
            otherParticipant,
          } as Chat;
        }),
      );

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

      // Add to local state immediately
      const newChat: Chat = {
        ...data,
        lastMessage: "",
        lastMessageTime: data.created_at,
        unreadCount: 0,
        otherParticipant,
      };
      addChatToState(newChat);

      return { data: newChat, error: null };
    } catch (err) {
      return { error: err as Error, data: null };
    }
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to new messages
    const channel = supabase
      .channel("chats-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchChats();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
        },
        () => {
          fetchChats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    chats,
    isLoading,
    error,
    createChat,
    addChatToState,
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
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data as Message[]);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string, type: Message["type"] = "text", stickerId?: string) => {
    if (!user || !chatId) return { error: new Error("No autenticado o chat no seleccionado") };

    try {
      const { data, error: insertError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content,
          type,
          sticker_id: stickerId || null,
        })
        .select()
        .single();

      if (insertError) {
        return { error: new Error(insertError.message) };
      }

      return { data, error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const sendSticker = async (stickerId: string, stickerUrl: string) => {
    return sendMessage(stickerUrl, "image", stickerId);
  };

  useEffect(() => {
    fetchMessages();

    if (chatId) {
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
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatId, user]);

  return {
    messages,
    isLoading,
    sendMessage,
    sendSticker,
    refreshMessages: fetchMessages,
  };
}
