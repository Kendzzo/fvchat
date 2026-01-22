import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Play, Image as ImageIcon, Sparkles, Trophy } from "lucide-react";

// Mock data for posts
const mockPosts = [{
  id: "1",
  author: {
    nick: "GamerPro",
    avatar: "🎮"
  },
  type: "image" as const,
  content: "https://images.unsplash.com/photo-1493711662062-fa541f7f2b3e?w=400&h=400&fit=crop",
  text: "¡Mi nuevo setup gaming está increíble! 🔥",
  likes: 42,
  comments: 8,
  isLiked: false,
  createdAt: "2h"
}, {
  id: "2",
  author: {
    nick: "ArtistaDigital",
    avatar: "🎨"
  },
  type: "image" as const,
  content: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=400&fit=crop",
  text: "Mi último dibujo digital ✨ ¿Qué os parece?",
  likes: 87,
  comments: 15,
  isLiked: true,
  createdAt: "4h"
}, {
  id: "3",
  author: {
    nick: "SkaterKid",
    avatar: "🛹"
  },
  type: "video" as const,
  content: "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=400&h=400&fit=crop",
  text: "Nuevo truco! 🛹💪",
  likes: 156,
  comments: 23,
  isLiked: false,
  createdAt: "6h"
}];

// Mock challenges
const mockChallenges = [{
  id: "1",
  title: "Desafío del día",
  description: "¡Comparte tu mejor cara de sorpresa! 😮",
  participants: 234,
  endsIn: "18h",
  topUsers: ["🏆 GamerPro", "🥈 ArtistaDigital", "🥉 SkaterKid"]
}];
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"posts" | "challenges">("posts");
  const [posts, setPosts] = useState(mockPosts);
  const toggleLike = (postId: string) => {
    setPosts(posts.map(post => post.id === postId ? {
      ...post,
      isLiked: !post.isLiked,
      likes: post.isLiked ? post.likes - 1 : post.likes + 1
    } : post));
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 py-3">
          <h1 className="font-gaming font-bold gradient-text text-4xl">VFC</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          <button onClick={() => setActiveTab("posts")} className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === "posts" ? "text-foreground" : "text-muted-foreground"}`}>
            <span className="flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Publicaciones
            </span>
            {activeTab === "posts" && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary mx-[20px]" />}
          </button>
          <button onClick={() => setActiveTab("challenges")} className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === "challenges" ? "text-foreground" : "text-muted-foreground"}`}>
            <span className="flex items-center justify-center gap-2">
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
      }} className="p-4 space-y-4 bg-[#5f4ba0]">
            {/* Stories/Avatars Row */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-2xl">
                    ➕
                  </div>
                </div>
                <span className="text-xs text-white font-bold">Tu historia</span>
              </div>
              {["🎮", "🎨", "🛹", "🎵", "📸"].map((emoji, i) => <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="avatar-frame w-16 h-16">
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-2xl">
                      {emoji}
                    </div>
                  </div>
                  <span className="text-xs text-white">Amigo{i + 1}</span>
                </div>)}
            </div>

            {/* Posts */}
            {posts.map((post, index) => <motion.div key={post.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: index * 0.1
        }} className="post-card border-success-foreground border-solid border">
                {/* Post Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                      <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-lg">
                        {post.author.avatar}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">@{post.author.nick}</p>
                      <p className="text-xs text-muted-foreground">{post.createdAt}</p>
                    </div>
                  </div>
                  <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="relative rounded-xl overflow-hidden -mx-4 aspect-square">
                  <img src={post.content} alt="" className="w-full h-full object-cover" />
                  {post.type === "video" && <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                      <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center">
                        <Play className="w-8 h-8 text-foreground ml-1" />
                      </div>
                    </div>}
                </div>

                {/* Post Text */}
                <p className="text-sm">{post.text}</p>

                {/* Post Actions */}
                <div className="flex items-center gap-6 pt-2">
                  <motion.button whileTap={{
              scale: 0.9
            }} onClick={() => toggleLike(post.id)} className="flex items-center gap-2 text-sm">
                    <Heart className={`w-6 h-6 transition-colors ${post.isLiked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    <span className={post.isLiked ? "text-destructive" : "text-muted-foreground"}>
                      {post.likes}
                    </span>
                  </motion.button>
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="w-6 h-6" />
                    <span>{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>)}
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
            {/* Daily Challenge */}
            {mockChallenges.map(challenge => <motion.div key={challenge.id} initial={{
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
                        {challenge.title}
                      </span>
                    </div>
                    <h3 className="text-lg font-gaming font-bold">{challenge.description}</h3>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-warning/20 text-warning text-xs font-medium">
                    {challenge.endsIn}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex -space-x-2">
                    {["🎮", "🎨", "🛹"].map((emoji, i) => <div key={i} className="w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-sm">
                        {emoji}
                      </div>)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {challenge.participants} participantes
                  </span>
                </div>

                {/* Top 3 */}
                <div className="space-y-2 mb-4">
                  {challenge.topUsers.map((user, i) => <div key={i} className="flex items-center gap-2 text-sm">
                      <span>{user}</span>
                    </div>)}
                </div>

                <motion.button whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} className="btn-gaming w-full py-3 rounded-xl text-foreground font-gaming">
                  ¡Participar!
                </motion.button>
              </motion.div>)}

            {/* Past challenges placeholder */}
            <div className="glass-card p-6 text-center">
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