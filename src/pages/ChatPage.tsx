import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Search, Plus, Send, Loader2, AlertCircle, Sparkles, Users, Shield } from "lucide-react";
import { useChats, useMessages, Chat } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useModeration } from "@/hooks/useModeration";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { NewChatModal } from "@/components/NewChatModal";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { ChatOptionsMenu } from "@/components/ChatOptionsMenu";
import { ChatMediaUpload } from "@/components/ChatMediaUpload";
import { ModerationWarning } from "@/components/ModerationWarning";
import { SuspensionBanner } from "@/components/SuspensionBanner";
import { ProfilePhoto, ProfilePhotoWithStatus } from "@/components/ProfilePhoto";
import { StickerPicker } from "@/components/StickerPicker";
import { LegalGate } from "@/components/LegalGate";
import { formatLastSeen, isOnline } from "@/hooks/usePresence";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Sticker } from "@/hooks/useStickers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatPage() {
  const { user, profile, canInteract, refreshProfile } = useAuth();
  const { chats, isLoading, refreshChats, createChat, markChatAsReadLocal } = useChats();
  const { markChatAsRead } = useUnreadMessages();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showLegalGate, setShowLegalGate] = useState(false);

  // Check if legal terms are accepted
  const legalAccepted = (profile as any)?.legal_accepted === true;

  // Show legal gate if not accepted when trying to interact
  useEffect(() => {
    if (!legalAccepted && canInteract && user) {
      setShowLegalGate(true);
    }
  }, [legalAccepted, canInteract, user]);

  const filteredChats = chats.filter((chat) =>
    (chat.name || chat.otherParticipant?.nick || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const selectedChat = chats.find((c) => c.id === selectedChatId) || null;

  const handleNewChatClick = () => {
    if (!canInteract) {
      toast.error("Cuenta pendiente de aprobación parental");
      return;
    }
    setShowNewChatModal(true);
  };

  const handleNewGroupClick = () => {
    if (!canInteract) {
      toast.error("Cuenta pendiente de aprobación parental");
      return;
    }
    setShowCreateGroupModal(true);
  };

  const handleChatCreated = (chat: Chat) => {
    setSelectedChatId(chat.id);
  };

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChatId(chat.id);
    markChatAsReadLocal(chat.id);
    await markChatAsRead(chat.id);
  };

  const handleMarkRead = async (chatId: string) => {
    markChatAsReadLocal(chatId);
    await markChatAsRead(chatId);
  };

  if (selectedChat) {
    return (
      <ChatDetail
        chat={selectedChat}
        canInteract={canInteract}
        onBack={() => setSelectedChatId(null)}
        onMarkRead={handleMarkRead}
      />
    );
  }

  const handleLegalAccepted = async () => {
    await refreshProfile();
    setShowLegalGate(false);
  };

  return (
    <div className="min-h-screen bg-primary-foreground my-0 py-0">
      {/* Legal Gate Modal */}
      {user && <LegalGate isOpen={showLegalGate} onAccepted={handleLegalAccepted} userId={user.id} />}

      <NewChatModal
        open={showNewChatModal}
        onOpenChange={setShowNewChatModal}
        onChatCreated={handleChatCreated}
        chats={chats}
        createChat={createChat}
      />
      <CreateGroupModal
        open={showCreateGroupModal}
        onOpenChange={setShowCreateGroupModal}
        onGroupCreated={handleChatCreated}
        createChat={createChat}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b px-4 opacity-100 border-transparent bg-[#1b0637] py-[11px] pt-0">
        <div className="flex items-center justify-between mb-4 my-0 py-0 pb-0 pt-0">
          <h1 className="font-gaming font-bold gradient-text text-3xl">Chat</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className={`p-2 rounded-xl bg-card transition-colors text-destructive-foreground ${!canInteract ? "opacity-50" : ""}`}
              >
                <Plus className="w-[30px] h-[30px] bg-transparent text-white" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleNewChatClick} className="gap-2">
                <Send className="w-4 h-4" />
                Nuevo chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewGroupClick} className="gap-2">
                <Users className="w-4 h-4" />
                Nuevo grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!canInteract && (
          <div className="mb-3 p-2 rounded-lg bg-warning/20 flex items-center gap-2 text-warning text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Cuenta pendiente de aprobación parental</span>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-secondary-foreground text-white" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-gaming w-full pl-12 px-[49px] my-0 py-[6px]"
            placeholder="Busca un chat .."
          />
        </div>
      </header>

      {/* Chat List */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-[4px]">
            <p className="text-muted-foreground text-xl">
              {searchQuery ? "No se encontraron chats" : "No tienes chats aún"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">¡Añade amigos desde tu perfil para empezar a chatear!</p>
          </div>
        ) : (
          filteredChats.map((chat, index) => (
            <motion.button
              key={chat.id}
              initial={{
                opacity: 0,
                x: -20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: index * 0.05,
              }}
              onClick={() => handleSelectChat(chat)}
              className="w-full glass-card p-4 hover:bg-card/60 transition-colors my-[15px] rounded-full border-transparent shadow-none flex items-center justify-start gap-[16px] pt-[10px] pb-[10px] mt-[10px] mb-[10px]"
            >
              <ProfilePhotoWithStatus
                url={(chat.otherParticipant as any)?.profile_photo_url || null}
                nick={chat.is_group ? chat.name || "Grupo" : chat.otherParticipant?.nick || "Usuario"}
                isOnline={!chat.is_group && isOnline((chat.otherParticipant as any)?.last_seen_at ?? null)}
                size="lg"
                showBorder={true}
              />

              <div className="flex-1 text-left min-w-0">
                <div className="mb-1 ml-[3px] mr-[30px] items-end justify-between flex flex-row pt-px">
                  <span className="font-semibold truncate text-white">
                    {chat.is_group ? chat.name : chat.otherParticipant?.nick || "Usuario"}
                  </span>
                  <span className="text-xs text-white ml-0">
                    {chat.lastMessageTime
                      ? formatDistanceToNow(new Date(chat.lastMessageTime), {
                          addSuffix: false,
                          locale: es,
                        })
                      : ""}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate mb-0 mt-[7px] my-0">
                  {chat.lastMessage || "Sin mensajes"}
                </p>
              </div>

              {(chat.unreadCount || 0) > 0 && (
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-bold text-secondary-foreground">{chat.unreadCount}</span>
                </div>
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}

// Chat Detail Component
function ChatDetail({
  chat,
  onBack,
  onMarkRead,
  canInteract,
}: {
  chat: Chat;
  canInteract: boolean;
  onBack: () => void;
  onMarkRead: (chatId: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, sendSticker, refreshMessages } = useMessages(chat.id);
  const { checkContent, isChecking, suspensionInfo, formatSuspensionTime, checkSuspension } = useModeration();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    url: string;
    type: "image" | "video" | "audio";
  } | null>(null);
  const [moderationError, setModerationError] = useState<{
    reason: string;
    strikes?: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);

  // Lock to prevent duplicate sends
  const sendLock = useRef(false);

  // Get other user ID for 1:1 chats
  const otherUserId = !chat.is_group ? chat.participant_ids.find((id) => id !== user?.id) || null : null;

  // Check suspension on mount
  useEffect(() => {
    checkSuspension();
  }, [checkSuspension]);

  // Fetch other user's last_seen_at
  useEffect(() => {
    const fetchLastSeen = async () => {
      if (!otherUserId) return;
      const { data } = await supabase.from("profiles").select("last_seen_at").eq("id", otherUserId).maybeSingle();
      if (data) {
        setOtherUserLastSeen(data.last_seen_at);
      }
    };
    fetchLastSeen();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLastSeen, 30000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Mark as read when entering (run only when chat changes)
  useEffect(() => {
    void onMarkRead(chat.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);
  const isSuspended = suspensionInfo.suspended && suspensionInfo.until && suspensionInfo.until > new Date();

  const handleSend = async () => {
    // READ-ONLY mode check first
    if (!canInteract) {
      toast.info("🔒 Esta función se desbloquea cuando tu tutor apruebe tu cuenta.");
      return;
    }

    // Prevent duplicate sends
    if (sendLock.current) {
      console.log("[CHAT][SEND] Blocked: sendLock active");
      return;
    }

    if (!messageText.trim() && !pendingMedia) {
      console.log("[CHAT][SEND] Blocked: no content");
      return;
    }

    // NEVER block by isChecking - moderation is async post-send
    if (isSending) {
      console.log("[CHAT][SEND] Blocked: already sending");
      toast.error("Enviando... espera un momento");
      return;
    }

    // Check suspension first
    if (isSuspended) {
      console.log("[CHAT][SEND] Blocked: user suspended");
      toast.error("No puedes enviar mensajes mientras estás suspendido");
      return;
    }

    sendLock.current = true;
    setModerationError(null);
    setIsSending(true);

    try {
      let mediaSentOk = false;
      let textSentOk = false;
      const textToSend = messageText.trim();

      // 1) Media first - but NEVER block text if media fails
      if (pendingMedia) {
        console.log("[CHAT][DB_INSERT_START]", { type: pendingMedia.type, chatId: chat.id });
        const { error, data } = await sendMessage(pendingMedia.url, pendingMedia.type);
        if (error) {
          console.error("[CHAT][DB_INSERT_FAIL]", {
            status: (error as any)?.status,
            message: error.message,
          });
          // Check if permission error
          if (error.message?.includes("policy") || error.message?.includes("403") || error.message?.includes("401")) {
            toast.error("Permiso denegado (DB/RLS). Revisar políticas de messages.");
          } else {
            toast.error("No se pudo enviar el archivo");
          }
          // Keep pendingMedia so user can retry
        } else {
          mediaSentOk = true;
          setPendingMedia(null);
          console.log("[CHAT][DB_INSERT_OK]", { messageId: data?.id });
        }
      }

      // 2) Text: ALWAYS send (even if media failed) - moderation is POST-SEND async
      if (textToSend) {
        console.log("[CHAT][DB_INSERT_START]", { type: "text", chatId: chat.id, preview: textToSend.slice(0, 30) });
        const { error, data } = await sendMessage(textToSend, "text");
        if (error) {
          console.error("[CHAT][DB_INSERT_FAIL]", {
            status: (error as any)?.status,
            message: error.message,
          });
          // Check if permission error
          if (error.message?.includes("policy") || error.message?.includes("403") || error.message?.includes("401")) {
            toast.error("Permiso denegado (DB/RLS). Revisar políticas de messages.");
          } else {
            toast.error("No se pudo enviar el mensaje");
          }
        } else {
          textSentOk = true;
          setMessageText("");
          console.log("[CHAT][DB_INSERT_OK]", { messageId: data?.id });

          // ASYNC post-send moderation (non-blocking) with timeout
          void (async () => {
            try {
              console.log("[CHAT][MODERATION_START_ASYNC]", { messageId: data?.id });
              const modResult = await checkContent(textToSend, "chat");
              console.log("[CHAT][MODERATION_RESULT]", {
                allowed: modResult.allowed,
                reason: modResult.reason,
              });
              if (!modResult.allowed) {
                setModerationError({
                  reason: modResult.reason || "Contenido no permitido",
                  strikes: modResult.strikes,
                });
                // TODO: could mark message as hidden via update here
              }
            } catch (modErr) {
              console.error("[CHAT][MODERATION_FAIL]", modErr);
              // Fail open - message already sent
            }
          })();
        }
      }

      // Fallback refetch for realtime issues
      if (mediaSentOk || textSentOk) {
        setTimeout(() => void refreshMessages(), 300);
      }
    } catch (err) {
      console.error("[CHAT][SEND_ERROR]", err);
      toast.error("No se pudo enviar el mensaje");
    } finally {
      setIsSending(false);
      sendLock.current = false;
      console.log("[CHAT][SEND_COMPLETE]");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ✅ CHANGE: auto-send media on ready, fallback to pendingMedia if send fails
  const handleMediaReady = async (url: string, type: "image" | "video" | "audio") => {
    console.log("[CHAT][MEDIA_READY]", type, url.slice(0, 50) + "...");

    // Same guards as sending
    if (!canInteract) {
      toast.info("🔒 Esta función se desbloquea cuando tu tutor apruebe tu cuenta.");
      return;
    }

    if (sendLock.current) {
      console.log("[CHAT][AUTO_MEDIA_SEND] Blocked: sendLock active");
      return;
    }

    if (isSending) {
      console.log("[CHAT][AUTO_MEDIA_SEND] Blocked: already sending");
      toast.error("Enviando... espera un momento");
      return;
    }

    if (isSuspended) {
      console.log("[CHAT][AUTO_MEDIA_SEND] Blocked: user suspended");
      toast.error("No puedes enviar mensajes mientras estás suspendido");
      return;
    }

    sendLock.current = true;
    setModerationError(null);
    setIsSending(true);

    try {
      console.log("[CHAT][DB_INSERT_START]", { type, chatId: chat.id, auto: true });
      const { error, data } = await sendMessage(url, type);

      if (error) {
        console.error("[CHAT][DB_INSERT_FAIL]", {
          status: (error as any)?.status,
          message: error.message,
        });

        // Fallback: keep old behavior so user can retry manually
        setPendingMedia({ url, type });

        if (error.message?.includes("policy") || error.message?.includes("403") || error.message?.includes("401")) {
          toast.error("Permiso denegado (DB/RLS). Revisar políticas de messages.");
        } else {
          toast.error("No se pudo enviar el archivo");
        }
        return;
      }

      console.log("[CHAT][DB_INSERT_OK]", { messageId: data?.id, auto: true });
      setPendingMedia(null);

      // Refresh for realtime edge cases
      setTimeout(() => void refreshMessages(), 300);
    } catch (err) {
      console.error("[CHAT][AUTO_MEDIA_SEND_ERROR]", err);

      // Fallback to pending so user can still send
      setPendingMedia({ url, type });
      toast.error("No se pudo enviar automáticamente. Pulsa enviar para reintentar.");
    } finally {
      setIsSending(false);
      sendLock.current = false;
      console.log("[CHAT][AUTO_MEDIA_SEND_COMPLETE]");
    }
  };

  const handleStickerSelect = async (sticker: Sticker) => {
    // READ-ONLY mode check first
    if (!canInteract) {
      toast.info("🔒 Esta función se desbloquea cuando tu tutor apruebe tu cuenta.");
      return;
    }

    if (isSuspended || isSending || sendLock.current) {
      console.log("[CHAT][SEND_STICKER] Blocked");
      return;
    }

    sendLock.current = true;
    setIsSending(true);

    try {
      console.log("[CHAT][SEND_STICKER] Sending:", sticker.name);
      const { error } = await sendSticker(sticker.id, sticker.image_url);
      if (error) {
        console.error("[CHAT][SEND_STICKER] Error:", error);
        toast.error("Error al enviar sticker");
      } else {
        console.log("[CHAT][SEND_STICKER] Success");
      }
    } catch (err) {
      console.error("[CHAT][SEND_STICKER] Exception:", err);
      toast.error("Error al enviar sticker");
    } finally {
      setIsSending(false);
      sendLock.current = false;
    }
  };
  const presenceText = otherUserLastSeen
    ? formatLastSeen(otherUserLastSeen)
    : chat.is_group
      ? `${chat.participant_ids.length} participantes`
      : "Sin conexión reciente";
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{
              scale: 0.9,
            }}
            onClick={onBack}
            className="p-2 rounded-xl bg-card transition-colors text-white text-xl"
          >
            ←
          </motion.button>

          <div className="flex items-center gap-3 flex-1">
            <ProfilePhotoWithStatus
              url={(chat.otherParticipant as any)?.profile_photo_url || null}
              nick={chat.is_group ? chat.name || "Grupo" : chat.otherParticipant?.nick || "Usuario"}
              isOnline={!chat.is_group && isOnline(otherUserLastSeen)}
              size="md"
              showBorder={true}
            />
            <div>
              <p className="font-semibold text-sm">
                {chat.is_group ? chat.name : chat.otherParticipant?.nick || "Usuario"}
              </p>
              <p className={`text-xs ${isOnline(otherUserLastSeen) ? "text-green-500" : "text-muted-foreground"}`}>
                {presenceText}
              </p>
            </div>
          </div>

          <ChatOptionsMenu chat={chat} otherUserId={otherUserId} />
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 p-4 space-y-3 overflow-y-auto bg-white"
        style={{
          paddingBottom: pendingMedia ? "120px" : "80px",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay mensajes aún</p>
            <p className="text-sm text-muted-foreground mt-2">¡Envía el primer mensaje!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            const isSticker = msg.sticker_id && msg.sticker;
            const isAudio = msg.type === "audio";
            const isMedia = msg.type === "image" || msg.type === "photo" || msg.type === "video";
            return (
              <motion.div
                key={msg.id}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={isSticker ? "p-1" : isMine ? "chat-bubble-sent" : "chat-bubble-received"}>
                  {isSticker ? (
  <div className="bg-white rounded-2xl p-2 inline-flex">
    <img
      src={msg.sticker!.image_url}
      alt={msg.sticker!.name}
      className="w-32 h-32 object-contain bg-transparent"
      style={{ imageRendering: "auto" }}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (!target.src.includes("?v=")) {
          target.src = msg.sticker!.image_url + "?v=1";
        } else {
          console.error("[CHAT] Sticker load failed:", msg.sticker!.image_url);
          toast.error("Sticker no disponible");
        }
      }}
    />
  </div>
) : (
  ...
)}
                    <audio src={msg.content} controls className="max-w-[240px]" />
                  ) : isMedia ? (
                    msg.type === "video" ? (
                      <video src={msg.content} controls className="max-w-[200px] rounded-lg" playsInline />
                    ) : (
                      <img src={msg.content} alt="Media" className="max-w-[200px] rounded-lg" />
                    )
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${isMine ? "text-foreground/60" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: false,
                      locale: es,
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suspension Banner */}
      {isSuspended && suspensionInfo.until && (
        <div className="absolute bottom-24 left-4 right-4">
          <SuspensionBanner until={suspensionInfo.until} formatTime={formatSuspensionTime} />
        </div>
      )}

      {/* Moderation Warning */}
      {moderationError && (
        <div className="absolute bottom-24 left-4 right-4">
          <ModerationWarning
            reason={moderationError.reason}
            strikes={moderationError.strikes}
            onDismiss={() => setModerationError(null)}
          />
        </div>
      )}

      {/* Pending media preview */}
      {pendingMedia && (
        <div className="absolute bottom-20 left-4 right-4 bg-card rounded-xl p-3 flex items-center gap-3 shadow-lg">
          {pendingMedia.type === "video" ? (
            <video src={pendingMedia.url} className="w-16 h-16 object-cover rounded-lg" />
          ) : pendingMedia.type === "audio" ? (
            <audio src={pendingMedia.url} controls className="w-full" />
          ) : (
            <img src={pendingMedia.url} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {pendingMedia.type === "video" ? "Vídeo" : pendingMedia.type === "audio" ? "Audio" : "Imagen"} listo para
              enviar
            </p>
            <p className="text-xs text-muted-foreground">Pulsa enviar o añade un mensaje</p>
          </div>
          <button onClick={() => setPendingMedia(null)} className="p-2 rounded-full bg-destructive/20 text-destructive">
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 p-4 backdrop-blur-xl border-t border-border/30 safe-bottom bg-success-foreground">
        {/* Read-only mode banner */}
        {!canInteract && (
          <div className="mb-3 p-2 rounded-lg bg-warning/20 flex items-center gap-2 text-warning text-sm">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>🔒 Modo solo lectura - pendiente de aprobación del tutor</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <ChatMediaUpload onMediaReady={handleMediaReady} disabled={!canInteract || isSending || isSuspended} />

          <motion.button
            whileTap={{
              scale: 0.9,
            }}
            onClick={() => {
              if (!canInteract) {
                toast.info("🔒 Esta función se desbloquea cuando tu tutor apruebe tu cuenta.");
                return;
              }
              setShowStickerPicker(true);
            }}
            disabled={!canInteract || isSuspended}
            className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-[27px] h-[27px] text-white" />
          </motion.button>

          <input
            type="text"
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              setModerationError(null);
            }}
            onKeyPress={handleKeyPress}
            placeholder={
              !canInteract
                ? "🔒 Modo solo lectura"
                : isSuspended
                  ? "Cuenta bloqueada temporalmente"
                  : "Escribe un mensaje..."
            }
            className="input-gaming flex-1 mb-[5px] mt-0 py-[9px]"
            disabled={!canInteract || isSending || isSuspended}
          />

          <motion.button
            whileTap={{
              scale: 0.9,
            }}
            onClick={handleSend}
            disabled={!canInteract || (!messageText.trim() && !pendingMedia) || isSending || isSuspended}
            className="p-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground px-[14px] py-[14px] mb-[5px] opacity-100 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Sticker Picker */}
      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={handleStickerSelect}
      />
    </div>
  );
}
