import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Share2, MoreHorizontal, Play, Image as ImageIcon, Sparkles, Trophy, Loader2, X } from "lucide-react";
import { usePosts } from "@/hooks/usePosts";
import { useChallenges } from "@/hooks/useChallenges";
import { useFriendships } from "@/hooks/useFriendships";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CommentSection } from "@/components/CommentSection";
import { AvatarBadge } from "@/components/avatar/AvatarBadge";

interface FriendWithRecentPost {
  friend_id: string;
  nick: string;
  avatar_snapshot_url: string | null;
  last_post_at: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "challenges">("posts");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const { posts, isLoading: postsLoading, toggleLike } = usePosts();
  const { todayChallenge, isLoading: challengeLoading } = useChallenges();
  const { friends, isLoading: friendsLoading } = useFriendships();

  // Listen for home reset event from nav
  useEffect(() => {
    const handleHomeReset = () => {
      setSelectedFriendId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    window.addEventListener('vfc-home-reset', handleHomeReset);
    return () => window.removeEventListener('vfc-home-reset', handleHomeReset);
  }, []);

  // Calculate friends with recent posts, ordered by most recent post
  const friendsWithRecentPosts = useMemo((): FriendWithRecentPost[] => {
    if (!friends.length || !posts.length) return [];
    
    // Get friend IDs
    const friendIds = new Set(friends.map(f => f.friend?.id).filter(Boolean) as string[]);
    
    // Filter posts by friends and group by author
    const postsByFriend = new Map<string, { post: typeof posts[0], friend: typeof friends[0]['friend'] }>();
    
    for (const post of posts) {
      if (friendIds.has(post.author_id)) {
        const existing = postsByFriend.get(post.author_id);
        // Keep only the most recent post per friend
        if (!existing || new Date(post.created_at) > new Date(existing.post.created_at)) {
          const friendData = friends.find(f => f.friend?.id === post.author_id)?.friend;
          if (friendData) {
            postsByFriend.set(post.author_id, { post, friend: friendData });
          }
        }
      }
    }
    
    // Convert to array and sort by most recent post
    return Array.from(postsByFriend.entries())
      .map(([friend_id, { post, friend }]) => ({
        friend_id,
        nick: friend?.nick || 'Usuario',
        avatar_snapshot_url: friend?.avatar_snapshot_url || null,
        last_post_at: post.created_at
      }))
      .sort((a, b) => new Date(b.last_post_at).getTime() - new Date(a.last_post_at).getTime())
      .slice(0, 10);
  }, [friends, posts]);

  // Get selected friend's nick for the filter banner
  const selectedFriendNick = useMemo(() => {
    if (!selectedFriendId) return null;
    const friend = friendsWithRecentPosts.find(f => f.friend_id === selectedFriendId);
    return friend?.nick || null;
  }, [selectedFriendId, friendsWithRecentPosts]);

  // Filter posts based on selected friend
  const filteredPosts = useMemo(() => {
    if (!selectedFriendId) return posts;
    return posts.filter(post => post.author_id === selectedFriendId);
  }, [posts, selectedFriendId]);

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: false,
        locale: es
      });
    } catch {
      return 'hace un momento';
    }
  };

  const clearFilter = () => {
    setSelectedFriendId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen my-0 py-0 bg-[#e8e6ff]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 py-0">
          <h1 className="font-gaming gradient-text font-extrabold text-xs my-0"></h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          <button 
            onClick={() => setActiveTab("posts")} 
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === "posts" ? "text-foreground" : "text-muted-foreground"}`}
          >
            <span className="flex items-center justify-center gap-2 font-bold text-xl py-0 mb-0 ml-[10px]">
              <ImageIcon className="w-[20px] h-[20px]" />
              Publicaciones
            </span>
            {activeTab === "posts" && (
              <motion.div 
                layoutId="tab-indicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-md my-0 py-0 mx-[20px] mb-0 mt-0" 
              />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("challenges")} 
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === "challenges" ? "text-foreground" : "text-muted-foreground"}`}
          >
            <span className="flex items-center justify-center gap-2 font-bold text-xl mr-[10px]">
              <Trophy className="w-[20px] h-[20px]" />
              Desafíos
            </span>
            {activeTab === "challenges" && (
              <motion.div 
                layoutId="tab-indicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary" 
              />
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "posts" ? (
          <motion.div 
            key="posts" 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 20 }} 
            className="p-4 space-y-4 bg-[#e8e6ff] py-0 my-px px-[5px]"
          >
            {/* Stories/Friends Row */}
            <div className="overflow-x-auto pb-2 scrollbar-hide mx-0 my-0 px-0 py-0 items-start justify-start flex flex-row gap-[15px] mt-[11px] mb-0">
              {/* Tu historia - always first */}
              <div 
                className="flex flex-col items-center gap-1 flex-shrink-0 mx-[10px] cursor-pointer" 
                onClick={() => navigate('/app/publish')}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5 px-0 py-0 hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full flex items-center justify-center text-2xl bg-destructive-foreground mx-0 px-[30px] py-[30px] text-black/[0.97]">
                    ➕
                  </div>
                </div>
                <span className="text-base font-bold text-secondary-foreground">Tu historia</span>
              </div>

              {/* Real friends with recent posts */}
              {friendsWithRecentPosts.map((friend) => (
                <div 
                  key={friend.friend_id} 
                  className="flex flex-col items-center gap-1 flex-shrink-0 mx-[2px] cursor-pointer"
                  onClick={() => setSelectedFriendId(friend.friend_id)}
                >
                  <div className={`w-16 h-16 rounded-full p-0.5 hover:scale-105 transition-transform ${
                    selectedFriendId === friend.friend_id 
                      ? 'bg-gradient-to-r from-secondary to-primary ring-2 ring-secondary' 
                      : 'bg-gradient-to-r from-primary/50 to-secondary/50'
                  }`}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {friend.avatar_snapshot_url ? (
                        <img 
                          src={friend.avatar_snapshot_url} 
                          alt={friend.nick}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {friend.nick.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-secondary-foreground max-w-[64px] truncate text-center">
                    {friend.nick}
                  </span>
                </div>
              ))}

              {/* Show placeholder if no friends with posts */}
              {!friendsLoading && friendsWithRecentPosts.length === 0 && friends.length === 0 && (
                <div className="flex flex-col items-center gap-1 flex-shrink-0 mx-[2px] opacity-50">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-center">Añade amigos</span>
                </div>
              )}
            </div>

            {/* Filter Banner */}
            {selectedFriendId && selectedFriendNick && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 mx-[5px]"
              >
                <span className="text-sm font-medium text-foreground">
                  Viendo publicaciones de <span className="text-primary font-bold">@{selectedFriendNick}</span>
                </span>
                <button
                  onClick={clearFilter}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                  Quitar filtro
                </button>
              </motion.div>
            )}

            {/* Loading state */}
            {postsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-gaming font-bold mb-2">
                  {selectedFriendId ? 'Sin publicaciones' : 'No hay publicaciones'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedFriendId 
                    ? 'Este amigo aún no ha publicado nada.'
                    : '¡Sé el primero en publicar algo!'}
                </p>
                {selectedFriendId && (
                  <button
                    onClick={clearFilter}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    Ver todas las publicaciones
                  </button>
                )}
              </div>
            ) : (
              /* Posts */
              filteredPosts.map((post, index) => (
                <motion.div 
                  key={post.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.1 }} 
                  className="post-card border-success-foreground text-gray-500 bg-success-foreground px-0 my-[20px] mx-[5px] mt-0 mb-[10px]"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between px-[20px] mt-[10px] my-[5px] mb-[20px]">
                    <div className="flex items-center gap-3 ml-[10px]">
                      <AvatarBadge
                        avatarUrl={post.author?.avatar_snapshot_url}
                        nick={post.author?.nick || 'Usuario'}
                        size="md"
                      />
                      <div>
                        <p className="font-semibold text-secondary-foreground text-lg">@{post.author?.nick || "Usuario"}</p>
                        <p className="text-xs text-gray-500">{formatTime(post.created_at)}</p>
                      </div>
                    </div>
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="text-black w-[25px] h-[25px] mr-[10px]" />
                    </button>
                  </div>

                  {/* Post Content */}
                  {post.content_url && (
                    <div className="relative rounded-xl overflow-hidden -mx-4 aspect-square">
                      <img src={post.content_url} alt="" className="w-full h-full object-contain" />
                      {post.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/20 py-0 px-0 mx-[12px]">
                          <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center">
                            <Play className="w-8 h-8 text-foreground ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Post Text */}
                  {post.text && <p className="mx-[20px] text-base ml-[30px]">{post.text}</p>}

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 pt-2 mx-[20px] ml-[30px]">
                    <motion.button 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => toggleLike(post.id)} 
                      className="flex items-center gap-2 text-sm"
                    >
                      <Heart className={`w-6 h-6 transition-colors ${post.isLiked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                      <span className={post.isLiked ? "text-destructive" : "text-muted-foreground"}>
                        {post.likes_count}
                      </span>
                    </motion.button>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Share2 className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Comments Section */}
                  <CommentSection postId={post.id} postAuthorId={post.author_id} />
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="challenges" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="p-4 space-y-4"
          >
            {challengeLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : todayChallenge ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="challenge-card"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-secondary" />
                      <span className="text-xs font-medium text-secondary uppercase tracking-wider">
                        Desafío del día
                      </span>
                    </div>
                    <h3 className="text-lg font-gaming font-bold">{todayChallenge.description}</h3>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-warning/20 text-warning text-xs font-medium">
                    Activo
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex -space-x-2">
                    {(todayChallenge.top_entries || []).slice(0, 3).map((entry, i) => (
                      <AvatarBadge
                        key={i}
                        avatarUrl={entry.user?.avatar_snapshot_url}
                        nick={entry.user?.nick || 'Usuario'}
                        size="sm"
                        className="border-2 border-background"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {todayChallenge.participants_count || 0} participantes
                  </span>
                </div>

                {/* Top 3 */}
                <div className="space-y-2 mb-4">
                  {(todayChallenge.top_entries || []).map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>
                        {i === 0 ? "🏆" : i === 1 ? "🥈" : "🥉"} @{entry.user?.nick || "Usuario"}
                      </span>
                    </div>
                  ))}
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }} 
                  className="btn-gaming w-full py-3 rounded-xl text-foreground font-gaming"
                >
                  ¡Participar!
                </motion.button>
              </motion.div>
            ) : (
              <div className="glass-card p-6 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-gaming font-bold mb-2">No hay desafío activo</h3>
                <p className="text-sm text-muted-foreground">
                  ¡Vuelve mañana para el próximo desafío!
                </p>
              </div>
            )}

            {/* Past challenges placeholder */}
            <div className="glass-card p-6 text-center my-[30px]">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-gaming font-bold mb-2">Más desafíos</h3>
              <p className="text-sm text-muted-foreground">
                Cada día hay un nuevo desafío. ¡No te los pierdas!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
