import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Plus, MoreVertical, Image, Mic, Send, Loader2 } from "lucide-react";
import { useChats, useMessages, Chat } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ParentalGate } from "@/components/ParentalGate";
export default function ChatPage() {
  const {
    user,
    profile
  } = useAuth();
  const {
    chats,
    isLoading
  } = useChats();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const isApproved = profile?.parent_approved === true;
  const filteredChats = chats.filter(chat => (chat.name || chat.otherParticipant?.nick || "").toLowerCase().includes(searchQuery.toLowerCase()));

  // Show parental gate if not approved
  if (!isApproved) {
    return <div className="min-h-screen bg-background p-4">
        <header className="mb-6">
          <h1 className="text-xl font-gaming font-bold gradient-text">Chat</h1>
        </header>
        <ParentalGate tutorEmail={profile?.tutor_email} feature="el chat" />
      </div>;
  }
  if (selectedChat) {
    return <ChatDetail chat={selectedChat} onBack={() => setSelectedChat(null)} />;
  }
  return <div className="min-h-screen bg-primary-foreground my-0 py-0">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b px-4 opacity-100 border-transparent bg-[#1b0637] py-[11px]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-gaming font-bold gradient-text text-5xl">Chat</h1>
          <motion.button whileTap={{
          scale: 0.9
        }} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-5 h-5 bg-primary text-primary" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar chat..." className="input-gaming w-full pl-12 px-[49px] my-0" />
        </div>
      </header>

      {/* Chat List */}
      <div className="p-4 space-y-2">
        {isLoading ? <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : filteredChats.length === 0 ? <div className="text-center py-[4px]">
            <p className="text-muted-foreground">
              {searchQuery ? "No se encontraron chats" : "No tienes chats aún"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              ¡Añade amigos para empezar a chatear!
            </p>
          </div> : filteredChats.map((chat, index) => <motion.button key={chat.id} initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: index * 0.05
      }} onClick={() => setSelectedChat(chat)} className="w-full glass-card p-4 flex items-center gap-4 hover:bg-card/60 transition-colors">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-2xl">
                    {chat.is_group ? "👥" : (chat.otherParticipant?.avatar_data as any)?.emoji || "👤"}
                  </div>
                </div>
              </div>

              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold truncate">
                    {chat.is_group ? chat.name : chat.otherParticipant?.nick || "Usuario"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {chat.lastMessageTime ? formatDistanceToNow(new Date(chat.lastMessageTime), {
                addSuffix: false,
                locale: es
              }) : ""}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage || "Sin mensajes"}</p>
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
  onBack
}: {
  chat: Chat;
  onBack: () => void;
}) {
  const {
    user,
    profile
  } = useAuth();
  const {
    messages,
    isLoading,
    sendMessage
  } = useMessages(chat.id);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;
    setIsSending(true);
    const {
      error
    } = await sendMessage(messageText.trim());
    if (!error) {
      setMessageText("");
    }
    setIsSending(false);
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button whileTap={{
          scale: 0.9
        }} onClick={onBack} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
            ←
          </motion.button>

          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-lg">
                  {chat.is_group ? "👥" : (chat.otherParticipant?.avatar_data as any)?.emoji || "👤"}
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm">
                {chat.is_group ? chat.name : chat.otherParticipant?.nick || "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground">
                {chat.is_group ? `${chat.participant_ids.length} participantes` : "En línea"}
              </p>
            </div>
          </div>

          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-primary-foreground">
        {isLoading ? <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : messages.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground">No hay mensajes aún</p>
            <p className="text-sm text-muted-foreground mt-2">¡Envía el primer mensaje!</p>
          </div> : messages.map(msg => {
        const isMine = msg.sender_id === user?.id;
        return <motion.div key={msg.id} initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={isMine ? "chat-bubble-sent" : "chat-bubble-received"}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-foreground/60" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(msg.created_at), {
                addSuffix: false,
                locale: es
              })}
                  </p>
                </div>
              </motion.div>;
      })}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/30 safe-bottom">
        <div className="flex items-center gap-3">
          <button className="p-3 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
            <Image className="w-5 h-5" />
          </button>
          <button className="p-3 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
            <Mic className="w-5 h-5" />
          </button>
          <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)} onKeyPress={handleKeyPress} placeholder="Escribe un mensaje..." className="input-gaming flex-1" disabled={isSending} />
          <motion.button whileTap={{
          scale: 0.9
        }} onClick={handleSend} disabled={!messageText.trim() || isSending} className="p-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground disabled:opacity-50">
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>
    </div>;
}