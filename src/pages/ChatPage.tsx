import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Search, Plus, Send, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { useChats, useMessages, Chat } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useModeration } from "@/hooks/useModeration";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { NewChatModal } from "@/components/NewChatModal";
import { ChatOptionsMenu } from "@/components/ChatOptionsMenu";
import { ChatMediaUpload } from "@/components/ChatMediaUpload";
import { ModerationWarning } from "@/components/ModerationWarning";
import { SuspensionBanner } from "@/components/SuspensionBanner";
import { ProfilePhoto, ProfilePhotoWithStatus } from "@/components/ProfilePhoto";
import { StickerPicker } from "@/components/StickerPicker";
import { formatLastSeen, isOnline } from "@/hooks/usePresence";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Sticker } from "@/hooks/useStickers";
export default function ChatPage() {
  const {
    user,
    canInteract
  } = useAuth();
  const {
    chats,
    isLoading,
    refreshChats,
    createChat,
    markChatAsReadLocal
  } = useChats();
  const {
    markChatAsRead
  } = useUnreadMessages();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const filteredChats = chats.filter(chat => (chat.name || chat.otherParticipant?.nick || "").toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedChat = chats.find(c => c.id === selectedChatId) || null;
  const handleNewChatClick = () => {
    if (!canInteract) {
      toast.error("Cuenta pendiente de aprobación parental");
      return;
    }
    setShowNewChatModal(true);
  };
  const handleChatCreated = (chat: Chat) => {
    setSelectedChatId(chat.id);
  };
  const handleSelectChat = async (chat: Chat) => {
    setSelectedChatId(chat.id);
    // Mark as read both locally and in DB
    markChatAsReadLocal(chat.id);
    await markChatAsRead(chat.id);
  };
  const handleMarkRead = async (chatId: string) => {
    markChatAsReadLocal(chatId);
    await markChatAsRead(chatId);
  };
  if (selectedChat) {
    return <ChatDetail chat={selectedChat} onBack={() => setSelectedChatId(null)} onMarkRead={handleMarkRead} />;
  }
  return <div className="min-h-screen bg-primary-foreground my-0 py-0">
      <NewChatModal open={showNewChatModal} onOpenChange={setShowNewChatModal} onChatCreated={handleChatCreated} chats={chats} createChat={createChat} />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b px-4 opacity-100 border-transparent bg-[#1b0637] py-[11px] pt-0">
        <div className="flex items-center justify-between mb-4 my-0 py-0 pb-0 pt-0">
          <h1 className="font-gaming font-bold gradient-text text-3xl">Chat</h1>
          <motion.button whileTap={{
          scale: 0.9
        }} onClick={handleNewChatClick} className={`p-2 rounded-xl bg-card transition-colors text-destructive-foreground ${!canInteract ? "opacity-50" : ""}`}>
            <Plus className="w-[30px] h-[30px] bg-transparent text-white" />
          </motion.button>
        </div>

        {!canInteract && <div className="mb-3 p-2 rounded-lg bg-warning/20 flex items-center gap-2 text-warning text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Cuenta pendiente de aprobación parental</span>
          </div>}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-secondary-foreground text-white" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-gaming w-full pl-12 px-[49px] my-0 py-[6px]" placeholder="Busca un chat .." />
        </div>
      </header>

      {/* Chat List */}
      <div className="p-4 space-y-2">
        {isLoading ? <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : filteredChats.length === 0 ? <div className="text-center py-[4px]">
            <p className="text-muted-foreground text-xl">
              {searchQuery ? "No se encontraron chats" : "No tienes chats aún"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">¡Añade amigos desde tu perfil para empezar a chatear!</p>
          </div> : filteredChats.map((chat, index) => <motion.button key={chat.id} initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: index * 0.05
      }} onClick={() => handleSelectChat(chat)} className="w-full glass-card p-4 flex items-center gap-4 hover:bg-card/60 transition-colors my-[15px] rounded-full border-transparent shadow-none">
              <ProfilePhotoWithStatus url={(chat.otherParticipant as any)?.profile_photo_url || null} nick={chat.is_group ? chat.name || "Grupo" : chat.otherParticipant?.nick || "Usuario"} isOnline={!chat.is_group && isOnline((chat.otherParticipant as any)?.last_seen_at ?? null)} size="lg" showBorder={true} />

              <div className="flex-1 text-left min-w-0">
                <div className="mb-1 ml-[3px] mr-[30px] items-end justify-between flex flex-row pt-px">
                  <span className="font-semibold truncate text-white">
                    {chat.is_group ? chat.name : chat.otherParticipant?.nick || "Usuario"}
                  </span>
                  <span className="text-xs text-white ml-0">
                    {chat.lastMessageTime ? formatDistanceToNow(new Date(chat.lastMessageTime), {
                addSuffix: false,
                locale: es
              }) : ""}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate mb-0 mt-[7px]">{chat.lastMessage || "Sin mensajes"}</p>
              </div>

              {(chat.unreadCount || 0) > 0 && <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-bold text-secondary-foreground">{chat.unreadCount}</span>
                </div>}
            </motion.button>)}
      </div>
    </div>;
}

// Chat Detail Component
function ChatDetail({
  chat,
  onBack,
  onMarkRead
}: {
  chat: Chat;
  onBack: () => void;
  onMarkRead: (chatId: string) => Promise<void>;
}) {
  const {
    user
  } = useAuth();
  const {
    messages,
    isLoading,
    sendMessage,
    sendSticker
  } = useMessages(chat.id);
  const {
    checkContent,
    isChecking,
    suspensionInfo,
    formatSuspensionTime,
    checkSuspension
  } = useModeration();
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

  // Get other user ID for 1:1 chats
  const otherUserId = !chat.is_group ? chat.participant_ids.find(id => id !== user?.id) || null : null;

  // Check suspension on mount
  useEffect(() => {
    checkSuspension();
  }, [checkSuspension]);

  // Fetch other user's last_seen_at
  useEffect(() => {
    const fetchLastSeen = async () => {
      if (!otherUserId) return;
      const {
        data
      } = await supabase.from("profiles").select("last_seen_at").eq("id", otherUserId).maybeSingle();
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
        behavior: "smooth"
      });
    }
  }, [messages]);

  // Mark as read when entering
  useEffect(() => {
    onMarkRead(chat.id);
  }, [chat.id, onMarkRead]);
  const isSuspended = suspensionInfo.suspended && suspensionInfo.until && suspensionInfo.until > new Date();
  const handleSend = async () => {
    if (!messageText.trim() && !pendingMedia || isSending || isChecking) return;

    // Check suspension first
    if (isSuspended) {
      return;
    }
    setModerationError(null);

    // Check text content with moderation (if there's text)
    if (messageText.trim()) {
      const result = await checkContent(messageText, "chat");
      if (!result.allowed) {
        setModerationError({
          reason: result.reason || "Contenido no permitido",
          strikes: result.strikes
        });
        return;
      }
    }
    setIsSending(true);
    try {
      if (pendingMedia) {
        // Send media message
        const {
          error
        } = await sendMessage(pendingMedia.url, pendingMedia.type);
        if (error) {
          toast.error("Error al enviar media");
        } else {
          setPendingMedia(null);
        }
      }
      if (messageText.trim()) {
        const {
          error
        } = await sendMessage(messageText.trim());
        if (error) {
          toast.error("Error al enviar mensaje");
        } else {
          setMessageText("");
        }
      }
    } finally {
      setIsSending(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const handleMediaReady = (url: string, type: "image" | "video" | "audio") => {
    setPendingMedia({
      url,
      type
    });
  };
  const handleStickerSelect = async (sticker: Sticker) => {
    if (isSuspended || isSending) return;
    setIsSending(true);
    try {
      const {
        error
      } = await sendSticker(sticker.id, sticker.image_url);
      if (error) {
        toast.error("Error al enviar sticker");
      }
    } finally {
      setIsSending(false);
    }
  };
  const presenceText = otherUserLastSeen ? formatLastSeen(otherUserLastSeen) : chat.is_group ? `${chat.participant_ids.length} participantes` : "Sin conexión reciente";
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button whileTap={{
          scale: 0.9
        }} onClick={onBack} className="p-2 rounded-xl bg-card transition-colors text-white text-xl">
            ←
          </motion.button>

          <div className="flex items-center gap-3 flex-1">
            <ProfilePhotoWithStatus url={(chat.otherParticipant as any)?.profile_photo_url || null} nick={chat.is_group ? chat.name || "Grupo" : chat.otherParticipant?.nick || "Usuario"} isOnline={!chat.is_group && isOnline(otherUserLastSeen)} size="md" showBorder={true} />
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
      <div ref={messagesContainerRef} className="flex-1 p-4 space-y-3 overflow-y-auto bg-white" style={{
      paddingBottom: pendingMedia ? "120px" : "80px"
    }}>
        {isLoading ? <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : messages.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground">No hay mensajes aún</p>
            <p className="text-sm text-muted-foreground mt-2">¡Envía el primer mensaje!</p>
          </div> : messages.map(msg => {
        const isMine = msg.sender_id === user?.id;
        const isSticker = msg.sticker_id && msg.sticker;
        const isMedia = msg.type === "image" || msg.type === "photo" || msg.type === "video";
        return <motion.div key={msg.id} initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={isSticker ? "p-1" : isMine ? "chat-bubble-sent" : "chat-bubble-received"}>
                  {isSticker ? <img src={msg.sticker!.image_url} alt={msg.sticker!.name} className="w-32 h-32 object-contain" /> : isMedia ? msg.type === "video" ? <video src={msg.content} controls className="max-w-[200px] rounded-lg" playsInline /> : <img src={msg.content} alt="Media" className="max-w-[200px] rounded-lg" /> : <p className="text-sm">{msg.content}</p>}
                  <p className={`text-[10px] mt-1 ${isMine ? "text-foreground/60" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(msg.created_at), {
                addSuffix: false,
                locale: es
              })}
                  </p>
                </div>
              </motion.div>;
      })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suspension Banner */}
      {isSuspended && suspensionInfo.until && <div className="absolute bottom-24 left-4 right-4">
          <SuspensionBanner until={suspensionInfo.until} formatTime={formatSuspensionTime} />
        </div>}

      {/* Moderation Warning */}
      {moderationError && <div className="absolute bottom-24 left-4 right-4">
          <ModerationWarning reason={moderationError.reason} strikes={moderationError.strikes} onDismiss={() => setModerationError(null)} />
        </div>}

      {/* Pending media preview */}
      {pendingMedia && <div className="absolute bottom-20 left-4 right-4 bg-card rounded-xl p-3 flex items-center gap-3 shadow-lg">
          {pendingMedia.type === "video" ? <video src={pendingMedia.url} className="w-16 h-16 object-cover rounded-lg" /> : <img src={pendingMedia.url} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {pendingMedia.type === "video" ? "Vídeo" : "Imagen"} listo para enviar
            </p>
            <p className="text-xs text-muted-foreground">Pulsa enviar o añade un mensaje</p>
          </div>
          <button onClick={() => setPendingMedia(null)} className="p-2 rounded-full bg-destructive/20 text-destructive">
            ✕
          </button>
        </div>}

      {/* Input */}
      <div className="sticky bottom-0 p-4 backdrop-blur-xl border-t border-border/30 safe-bottom bg-success-foreground">
        <div className="flex items-center gap-2">
          <ChatMediaUpload onMediaReady={handleMediaReady} disabled={isSending || isSuspended} />

          <motion.button whileTap={{
          scale: 0.9
        }} onClick={() => setShowStickerPicker(true)} disabled={isSuspended} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <Sparkles className="w-[27px] h-[27px] text-white" />
          </motion.button>

          <input type="text" value={messageText} onChange={e => {
          setMessageText(e.target.value);
          setModerationError(null);
        }} onKeyPress={handleKeyPress} placeholder={isSuspended ? "Cuenta bloqueada temporalmente" : "Escribe un mensaje..."} className="input-gaming flex-1 mb-[5px] mt-0 py-[9px]" disabled={isSending || isSuspended} />

          <motion.button whileTap={{
          scale: 0.9
        }} onClick={handleSend} disabled={!messageText.trim() && !pendingMedia || isSending || isChecking || isSuspended} className="p-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground px-[14px] py-[14px] mb-[5px] opacity-100 disabled:opacity-50">
            {isSending || isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Sticker Picker */}
      <StickerPicker isOpen={showStickerPicker} onClose={() => setShowStickerPicker(false)} onSelect={handleStickerSelect} />
    </div>;
}