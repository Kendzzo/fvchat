import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, Loader2, Shield, Users, ArrowLeft, 
  Image as ImageIcon, MessageCircle, FileText, Clock, 
  CheckCircle, XCircle, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import vfcLogo from "@/assets/vfc-logo.png";

interface Child {
  id: string;
  nick: string;
  birth_year: number;
  age_group: string;
  parent_approved: boolean;
  account_status: string;
  profile_photo_url: string | null;
  created_at: string;
}

interface Post {
  id: string;
  text: string | null;
  type: string;
  content_url: string | null;
  privacy: string;
  likes_count: number;
  created_at: string;
  is_challenge_entry: boolean;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  post: { id: string; text: string } | null;
  post_author: { id: string; nick: string } | null;
}

interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  participant_ids: string[];
  participants: { id: string; nick: string; profile_photo_url: string | null }[];
  last_message: { content: string; created_at: string } | null;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  type: string;
  created_at: string;
  sender_id: string;
  is_blocked: boolean;
  sender: { nick: string };
  sticker: { id: string; name: string; image_url: string } | null;
}

type TabType = "posts" | "comments" | "chats";

export default function ParentDashboardPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "error" | "children" | "child-detail" | "chat-messages">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [tutorEmail, setTutorEmail] = useState("");

  // Children list
  const [children, setChildren] = useState<Child[]>([]);

  // Selected child data
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);

  // Chat messages
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>("posts");

  const fetchChildren = useCallback(async () => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Token no proporcionado.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("parent-dashboard-data", {
        body: { token }
      });

      if (error || !data?.ok) {
        setStatus("error");
        setErrorMessage(data?.error || "Error al cargar datos.");
        return;
      }

      setTutorEmail(data.tutor_email);
      setChildren(data.children || []);
      setStatus("children");
    } catch (err) {
      console.error("Fetch children error:", err);
      setStatus("error");
      setErrorMessage("Error de conexión.");
    }
  }, [token]);

  const fetchChildDetail = async (childId: string) => {
    if (!token) return;

    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("parent-dashboard-data", {
        body: { token, child_user_id: childId }
      });

      if (error || !data?.ok) {
        setStatus("error");
        setErrorMessage(data?.error || "Error al cargar datos del niño.");
        return;
      }

      setSelectedChild(data.child);
      setPosts(data.posts || []);
      setComments(data.comments || []);
      setChats(data.chats || []);
      setActiveTab("posts");
      setStatus("child-detail");
    } catch (err) {
      console.error("Fetch child detail error:", err);
      setStatus("error");
      setErrorMessage("Error de conexión.");
    }
  };

  const fetchChatMessages = async (chat: Chat) => {
    if (!token || !selectedChild) return;

    setSelectedChat(chat);
    setMessagesLoading(true);
    setStatus("chat-messages");

    try {
      const { data, error } = await supabase.functions.invoke("parent-dashboard-data", {
        body: { token, child_user_id: selectedChild.id, chat_id: chat.id }
      });

      if (error || !data?.ok) {
        console.error("Fetch messages error:", error);
        setMessages([]);
      } else {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Fetch messages exception:", err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleBack = () => {
    if (status === "chat-messages") {
      setSelectedChat(null);
      setMessages([]);
      setStatus("child-detail");
    } else if (status === "child-detail") {
      setSelectedChild(null);
      setPosts([]);
      setComments([]);
      setChats([]);
      setStatus("children");
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.is_group) return "Grupo";
    const otherParticipants = chat.participants.filter(p => p.id !== selectedChild?.id);
    return otherParticipants.map(p => `@${p.nick}`).join(", ") || "Chat";
  };

  // Render loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-secondary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm text-center"
          >
            <img src={vfcLogo} alt="VFC" className="w-16 h-16 object-contain mx-auto mb-6" />
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-gaming font-bold text-destructive mb-2">
              Acceso no válido
            </h1>
            <p className="text-muted-foreground">{errorMessage}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Render children list
  if (status === "children") {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 py-4 flex items-center gap-3">
            <img src={vfcLogo} alt="VFC" className="w-10 h-10 object-contain" />
            <div className="flex-1">
              <h1 className="font-gaming font-bold gradient-text text-lg">Panel de Supervisión</h1>
              <p className="text-xs text-muted-foreground">{tutorEmail}</p>
            </div>
            <Shield className="w-6 h-6 text-secondary" />
          </div>
        </header>

        <main className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-5 h-5" />
            <span className="font-medium">Mis hijos/as ({children.length})</span>
          </div>

          {children.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay niños asociados a este email.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child) => (
                <motion.button
                  key={child.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fetchChildDetail(child.id)}
                  className="w-full p-4 rounded-2xl bg-card border border-border/50 text-left flex items-center gap-4 hover:border-secondary/50 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden">
                    {child.profile_photo_url ? (
                      <img src={child.profile_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-foreground">
                        {child.nick.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-gaming font-bold text-foreground truncate">@{child.nick}</p>
                    <p className="text-sm text-muted-foreground">
                      {child.age_group} años
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {child.parent_approved ? (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        Aprobado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <Clock className="w-4 h-4" />
                        Pendiente
                      </span>
                    )}
                    <span className={`text-xs ${
                      child.account_status === "active" ? "text-green-500" :
                      child.account_status === "suspended" ? "text-destructive" :
                      "text-warning"
                    }`}>
                      {child.account_status === "active" ? "Activo" :
                       child.account_status === "suspended" ? "Suspendido" : "Pendiente"}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Render child detail
  if (status === "child-detail" && selectedChild) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 py-4 flex items-center gap-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-xl hover:bg-muted/50">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden">
              {selectedChild.profile_photo_url ? (
                <img src={selectedChild.profile_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {selectedChild.nick.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-gaming font-bold text-foreground">@{selectedChild.nick}</h1>
              <p className="text-xs text-muted-foreground">{selectedChild.age_group} años</p>
            </div>
            <Eye className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Tabs */}
          <div className="flex border-t border-border/50">
            {([
              { key: "posts", label: "Publicaciones", icon: ImageIcon, count: posts.length },
              { key: "comments", label: "Comentarios", icon: FileText, count: comments.length },
              { key: "chats", label: "Chats", icon: MessageCircle, count: chats.length },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 text-xs font-medium transition-colors relative flex flex-col items-center gap-1 ${
                  activeTab === tab.key ? "text-secondary" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label} ({tab.count})</span>
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="parent-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary"
                  />
                )}
              </button>
            ))}
          </div>
        </header>

        <main className="p-4">
          <AnimatePresence mode="wait">
            {/* Posts Tab */}
            {activeTab === "posts" && (
              <motion.div
                key="posts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {posts.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Sin publicaciones</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="p-4 rounded-2xl bg-card border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            {post.privacy === "friends_only" ? "Amigos" : "Grupo edad"}
                          </span>
                          {post.is_challenge_entry && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary">
                              Desafío
                            </span>
                          )}
                        </div>
                      </div>
                      {post.text && (
                        <p className="text-foreground mb-2">{post.text}</p>
                      )}
                      {post.content_url && (
                        <div className="rounded-xl overflow-hidden bg-muted aspect-video">
                          {post.type === "video" ? (
                            <video src={post.content_url} controls className="w-full h-full object-contain" />
                          ) : (
                            <img src={post.content_url} alt="" className="w-full h-full object-contain" />
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">❤️ {post.likes_count} likes</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Comments Tab */}
            {activeTab === "comments" && (
              <motion.div
                key="comments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {comments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Sin comentarios</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 rounded-2xl bg-card border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                        {comment.post_author && (
                          <span className="text-xs text-secondary">
                            En post de @{comment.post_author.nick}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground">{comment.text}</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Chats Tab */}
            {activeTab === "chats" && (
              <motion.div
                key="chats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {chats.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Sin chats</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => fetchChatMessages(chat)}
                      className="w-full p-4 rounded-2xl bg-card border border-border/50 text-left hover:border-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{getChatName(chat)}</p>
                          {chat.last_message && (
                            <p className="text-sm text-muted-foreground truncate">
                              {chat.last_message.content}
                            </p>
                          )}
                        </div>
                        {chat.last_message && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(chat.last_message.created_at).split(",")[0]}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  }

  // Render chat messages
  if (status === "chat-messages" && selectedChat && selectedChild) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 py-4 flex items-center gap-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-xl hover:bg-muted/50">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="font-medium text-foreground">{getChatName(selectedChat)}</h1>
              <p className="text-xs text-muted-foreground">Chat de @{selectedChild.nick}</p>
            </div>
            <Eye className="w-5 h-5 text-muted-foreground" />
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-secondary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Sin mensajes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...messages].reverse().map((message) => {
                const isChild = message.sender_id === selectedChild.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isChild ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] ${isChild ? "order-1" : ""}`}>
                      {!isChild && (
                        <p className="text-xs text-muted-foreground mb-1">@{message.sender.nick}</p>
                      )}
                      <div
                        className={`p-3 rounded-2xl ${
                          isChild
                            ? "bg-gradient-to-r from-primary to-secondary text-foreground"
                            : "bg-card border border-border/50"
                        } ${message.is_blocked ? "opacity-50" : ""}`}
                      >
                        {message.is_blocked && (
                          <div className="flex items-center gap-1 text-xs text-destructive mb-1">
                            <XCircle className="w-3 h-3" />
                            Bloqueado por moderación
                          </div>
                        )}
                        {message.sticker ? (
                          <img
                            src={message.sticker.image_url}
                            alt={message.sticker.name}
                            className="w-20 h-20 object-contain"
                          />
                        ) : message.type === "image" || message.type === "photo" ? (
                          <img
                            src={message.content}
                            alt=""
                            className="max-w-full rounded-lg"
                          />
                        ) : message.type === "video" ? (
                          <video
                            src={message.content}
                            controls
                            className="max-w-full rounded-lg"
                          />
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Read-only footer */}
        <footer className="p-4 bg-card border-t border-border/50">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Eye className="w-4 h-4" />
            <span>Modo solo lectura</span>
          </div>
        </footer>
      </div>
    );
  }

  return null;
}
