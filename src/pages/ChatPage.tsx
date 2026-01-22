import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Plus, MoreVertical, Image, Mic, Send } from "lucide-react";

// Mock chat data
const mockChats = [{
  id: "1",
  name: "GamerPro",
  avatar: "🎮",
  lastMessage: "¿Jugamos luego?",
  time: "2min",
  unread: 2,
  isOnline: true
}, {
  id: "2",
  name: "ArtistaDigital",
  avatar: "🎨",
  lastMessage: "¡Me encanta tu dibujo!",
  time: "15min",
  unread: 0,
  isOnline: true
}, {
  id: "3",
  name: "Grupo Gaming 🎮",
  avatar: "👥",
  lastMessage: "SkaterKid: ¡Nos vemos!",
  time: "1h",
  unread: 5,
  isOnline: false,
  isGroup: true
}, {
  id: "4",
  name: "MusicoStar",
  avatar: "🎵",
  lastMessage: "Escucha esta canción",
  time: "3h",
  unread: 0,
  isOnline: false
}];
export default function ChatPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const filteredChats = mockChats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()));
  if (selectedChat) {
    const chat = mockChats.find(c => c.id === selectedChat);
    return <ChatDetail chat={chat!} onBack={() => setSelectedChat(null)} />;
  }
  return <div className="min-h-screen bg-[#5f4ba0]">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-border/30 px-4 py-3 bg-secondary-foreground">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-gaming font-bold gradient-text text-3xl">Chat</h1>
          <motion.button whileTap={{
          scale: 0.9
        }} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar chat..." className="input-gaming w-full pl-12" />
        </div>
      </header>

      {/* Chat List */}
      <div className="p-4 space-y-2 border-white">
        {filteredChats.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron chats</p>
          </div> : filteredChats.map((chat, index) => <motion.button key={chat.id} initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: index * 0.05
      }} onClick={() => setSelectedChat(chat.id)} className="w-full glass-card p-4 flex items-center gap-4 hover:bg-card/60 transition-colors border-white">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-2xl">
                    {chat.avatar}
                  </div>
                </div>
                {chat.isOnline && <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-secondary border-2 border-background" />}
              </div>

              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold truncate">{chat.name}</span>
                  <span className="text-xs text-muted-foreground">{chat.time}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
              </div>

              {chat.unread > 0 && <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-bold text-secondary-foreground">{chat.unread}</span>
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
  chat: typeof mockChats[0];
  onBack: () => void;
}) {
  const [message, setMessage] = useState("");

  // Mock messages
  const messages = [{
    id: "1",
    text: "¡Hola! 👋",
    isMine: false,
    time: "10:30"
  }, {
    id: "2",
    text: "¡Hey! ¿Qué tal?",
    isMine: true,
    time: "10:31"
  }, {
    id: "3",
    text: "Todo bien, ¿jugamos luego?",
    isMine: false,
    time: "10:32"
  }, {
    id: "4",
    text: "¡Claro! ¿A qué hora?",
    isMine: true,
    time: "10:33"
  }, {
    id: "5",
    text: "¿A las 5? 🎮",
    isMine: false,
    time: "10:34"
  }];
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
                  {chat.avatar}
                </div>
              </div>
              {chat.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary border-2 border-background" />}
            </div>
            <div>
              <p className="font-semibold text-sm">{chat.name}</p>
              <p className="text-xs text-muted-foreground">
                {chat.isOnline ? "En línea" : "Desconectado"}
              </p>
            </div>
          </div>

          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map(msg => <motion.div key={msg.id} initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
            <div className={msg.isMine ? "chat-bubble-sent" : "chat-bubble-received"}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.isMine ? "text-foreground/60" : "text-muted-foreground"}`}>
                {msg.time}
              </p>
            </div>
          </motion.div>)}
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
          <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Escribe un mensaje..." className="input-gaming flex-1" />
          <motion.button whileTap={{
          scale: 0.9
        }} className="p-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground">
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>;
}