import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Heart, Share2, MoreHorizontal, Play, Image as ImageIcon, Sparkles, Trophy, Loader2 } from "lucide-react";
import { usePosts } from "@/hooks/usePosts";
import { useChallenges } from "@/hooks/useChallenges";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CommentSection } from "@/components/CommentSection";
export default function HomePage() {
  const {
    profile
  } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "challenges">("posts");
  const {
    posts,
    isLoading: postsLoading,
    toggleLike
  } = usePosts();
  const {
    todayChallenge,
    isLoading: challengeLoading
  } = useChallenges();
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
  return <div className="min-h-screen my-0 py-0 bg-[#e8e6ff]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 py-[5px]">
          <h1 className="font-gaming gradient-text font-extrabold text-xs my-0">
        </h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          <button onClick={() => setActiveTab("posts")} className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === "posts" ? "text-foreground" : "text-muted-foreground"}`}>
            <span className="flex items-center justify-center gap-2 font-bold text-xl py-0 mb-0">
              <ImageIcon className="w-4 h-4" />
              Publicaciones
            </span>
            {activeTab === "posts" && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-md my-0 py-0 mx-[20px] mt-px mb-[5px]" />}
          </button>
          <button onClick={() => setActiveTab("challenges")} className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === "challenges" ? "text-foreground" : "text-muted-foreground"}`}>
            <span className="flex items-center justify-center gap-2 font-bold text-xl">
              <Trophy className="w-4 h-4" />
              Desafíos
            </span>
            {activeTab === "challenges" && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary" />}
          </button>
        </div>
      </header>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "posts" ? <motion.div key="posts" initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} exit={{
        opacity: 0,
        x: 20
      }} className="p-4 space-y-4 bg-[#e8e6ff] py-0 my-px px-[5px]">
            {/* Stories/Avatars Row */}
            <div className="overflow-x-auto pb-2 scrollbar-hide mx-0 my-0 px-0 py-0 items-start justify-start flex flex-row gap-[15px] mt-[11px] mb-0">
              <div className="flex flex-col items-center gap-1 flex-shrink-0 mx-[10px]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5 px-0 py-0">
                  <div className="w-full h-full rounded-full flex items-center justify-center text-2xl bg-destructive-foreground mx-0 px-[30px] py-[30px] text-black/[0.97]">
                    ➕
                  </div>
                </div>
                <span className="text-base font-bold text-secondary-foreground">Tu historia</span>
              </div>
              {["🎮", "🎨", "🛹", "🎵", "📸"].map((emoji, i) => <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 mx-[2px]">
                  <div className="avatar-frame w-16 h-16 px-0 py-0">
                    <div className="w-full h-full rounded-full flex items-center justify-center text-2xl bg-success-foreground px-0 py-0">
                      {emoji}
                    </div>
                  </div>
                  <span className="text-secondary-foreground text-base">Amigo{i + 1}</span>
                </div>)}
            </div>

            {/* Loading state */}
            {postsLoading ? <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div> : posts.length === 0 ? <div className="glass-card p-8 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-gaming font-bold mb-2">No hay publicaciones</h3>
                <p className="text-sm text-muted-foreground">
                  ¡Sé el primero en publicar algo!
                </p>
              </div> : (/* Posts */
        posts.map((post, index) => <motion.div key={post.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: index * 0.1
        }} className="post-card border-success-foreground text-gray-500 bg-success-foreground px-0 my-[20px] mx-[5px] mt-0">
                  {/* Post Header */}
                  <div className="flex items-center justify-between px-[20px] mt-[10px] my-[5px] mb-[20px]">
                    <div className="flex items-center gap-3 ml-[20px]">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                        <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-lg">
                          {(post.author?.avatar_data as any)?.emoji || "👤"}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">@{post.author?.nick || "Usuario"}</p>
                        <p className="text-xs text-gray-500">{formatTime(post.created_at)}</p>
                      </div>
                    </div>
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-black" />
                    </button>
                  </div>

                  {/* Post Content */}
                  {post.content_url && <div className="relative rounded-xl overflow-hidden -mx-4 aspect-square">
                      <img src={post.content_url} alt="" className="w-full h-full object-contain" />
                      {post.type === "video" && <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                          <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center">
                            <Play className="w-8 h-8 text-foreground ml-1" />
                          </div>
                        </div>}
                    </div>}

                  {/* Post Text */}
                  {post.text && <p className="mx-[20px] text-base ml-[60px]">{post.text}</p>}

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 pt-2 mx-[20px] ml-[60px]">
                    <motion.button whileTap={{
              scale: 0.9
            }} onClick={() => toggleLike(post.id)} className="flex items-center gap-2 text-sm">
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
                </motion.div>))}
          </motion.div> : <motion.div key="challenges" initial={{
        opacity: 0,
        x: 20
      }} animate={{
        opacity: 1,
        x: 0
      }} exit={{
        opacity: 0,
        x: -20
      }} className="p-4 space-y-4">
            {challengeLoading ? <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div> : todayChallenge ? <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="challenge-card">
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
                    {(todayChallenge.top_entries || []).slice(0, 3).map((entry, i) => <div key={i} className="w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-sm">
                        {(entry.user?.avatar_data as any)?.emoji || "👤"}
                      </div>)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {todayChallenge.participants_count || 0} participantes
                  </span>
                </div>

                {/* Top 3 */}
                <div className="space-y-2 mb-4">
                  {(todayChallenge.top_entries || []).map((entry, i) => <div key={i} className="flex items-center gap-2 text-sm">
                      <span>
                        {i === 0 ? "🏆" : i === 1 ? "🥈" : "🥉"} @{entry.user?.nick || "Usuario"}
                      </span>
                    </div>)}
                </div>

                <motion.button whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} className="btn-gaming w-full py-3 rounded-xl text-foreground font-gaming">
                  ¡Participar!
                </motion.button>
              </motion.div> : <div className="glass-card p-6 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-gaming font-bold mb-2">No hay desafío activo</h3>
                <p className="text-sm text-muted-foreground">
                  ¡Vuelve mañana para el próximo desafío!
                </p>
              </div>}

            {/* Past challenges placeholder */}
            <div className="glass-card p-6 text-center my-[30px]">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-gaming font-bold mb-2">Más desafíos</h3>
              <p className="text-sm text-muted-foreground">
                Cada día hay un nuevo desafío. ¡No te los pierdas!
              </p>
            </div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}