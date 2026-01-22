import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Edit3, UserPlus, QrCode, Grid, Heart, Shield, LogOut, ChevronRight, Lock, Bell, HelpCircle } from "lucide-react";

// Mock user data
const mockUser = {
  nick: "GamerPro",
  avatar: "🎮",
  ageGroup: "13-16",
  friendsCount: 47,
  postsCount: 23,
  likesReceived: 1234,
  level: 5,
  badges: ["🏆", "⭐", "🔥", "💎"],
  recentPosts: ["https://images.unsplash.com/photo-1493711662062-fa541f7f2b3e?w=200&h=200&fit=crop", "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=200&h=200&fit=crop", "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=200&h=200&fit=crop", "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&h=200&fit=crop", "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop", "https://images.unsplash.com/photo-1493711662062-fa541f7f2b3e?w=200&h=200&fit=crop"]
};
export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"posts" | "likes">("posts");
  const [showSettings, setShowSettings] = useState(false);
  if (showSettings) {
    return <SettingsView onBack={() => setShowSettings(false)} onLogout={() => navigate("/")} />;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-gaming font-bold">@{mockUser.nick}</h1>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{
            scale: 0.9
          }} onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 bg-[#3d2f6f]">
        {/* Profile Card */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="glass-card p-6 text-center border-success-foreground">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-r from-primary via-secondary to-accent p-1 animate-pulse-glow">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-5xl">
                {mockUser.avatar}
              </div>
            </div>
            <motion.button whileTap={{
            scale: 0.9
          }} className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shadow-lg">
              <Edit3 className="w-5 h-5" />
            </motion.button>
            
            {/* Level Badge */}
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-warning text-warning-foreground text-xs font-bold">
              Lvl {mockUser.level}
            </div>
          </div>

          {/* Nick & Age Group */}
          <h2 className="text-2xl font-gaming font-bold gradient-text mb-1">
            @{mockUser.nick}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Grupo de edad: {mockUser.ageGroup}
          </p>

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {mockUser.badges.map((badge, i) => <div key={i} className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center text-xl">
                {badge}
              </div>)}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-card">
              <p className="text-2xl font-gaming font-bold gradient-text">{mockUser.postsCount}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="p-3 rounded-xl bg-card">
              <p className="text-2xl font-gaming font-bold gradient-text">{mockUser.friendsCount}</p>
              <p className="text-xs text-muted-foreground">Amigos</p>
            </div>
            <div className="p-3 rounded-xl bg-card">
              <p className="text-2xl font-gaming font-bold text-destructive">{mockUser.likesReceived}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3">
          <motion.button whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground font-medium flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5" />
            Añadir amigos
          </motion.button>
          <motion.button whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} className="py-3 px-4 rounded-xl border-2 border-border/50 text-muted-foreground hover:text-foreground transition-colors">
            <QrCode className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          <button onClick={() => setActiveTab("posts")} className={`flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${activeTab === "posts" ? "text-foreground" : "text-muted-foreground"}`}>
            <Grid className="w-4 h-4" />
            Mis posts
            {activeTab === "posts" && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary" />}
          </button>
          <button onClick={() => setActiveTab("likes")} className={`flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${activeTab === "likes" ? "text-foreground" : "text-muted-foreground"}`}>
            <Heart className="w-4 h-4" />
            Likes
            {activeTab === "likes" && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary" />}
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-1">
          {mockUser.recentPosts.map((post, i) => <motion.div key={i} initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          delay: i * 0.05
        }} className="aspect-square rounded-lg overflow-hidden">
              <img src={post} alt="" className="w-full h-full object-cover" />
            </motion.div>)}
        </div>
      </div>
    </div>;
}

// Settings View
function SettingsView({
  onBack,
  onLogout
}: {
  onBack: () => void;
  onLogout: () => void;
}) {
  const settingsItems = [{
    icon: Edit3,
    label: "Editar perfil",
    action: () => {}
  }, {
    icon: Shield,
    label: "Privacidad y seguridad",
    action: () => {}
  }, {
    icon: Bell,
    label: "Notificaciones",
    action: () => {}
  }, {
    icon: Lock,
    label: "Control parental",
    action: () => {}
  }, {
    icon: HelpCircle,
    label: "Ayuda",
    action: () => {}
  }];
  return <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button whileTap={{
          scale: 0.9
        }} onClick={onBack} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
            ←
          </motion.button>
          <h1 className="text-xl font-gaming font-bold">Ajustes</h1>
        </div>
      </header>

      <div className="p-4 space-y-2">
        {settingsItems.map((item, i) => <motion.button key={i} initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: i * 0.05
      }} onClick={item.action} className="w-full glass-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-muted-foreground">
              <item.icon className="w-5 h-5" />
            </div>
            <span className="flex-1 text-left font-medium">{item.label}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>)}

        {/* Logout */}
        <motion.button initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: 0.3
      }} onClick={onLogout} className="w-full glass-card p-4 flex items-center gap-4 mt-8">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center text-destructive">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="flex-1 text-left font-medium text-destructive">Cerrar sesión</span>
        </motion.button>

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-muted-foreground">VFC v1.0.0</p>
          <p className="text-xs text-muted-foreground">Red social segura para menores</p>
        </div>
      </div>
    </div>;
}