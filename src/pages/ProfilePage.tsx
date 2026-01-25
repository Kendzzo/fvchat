import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Edit3, UserPlus, QrCode, Grid, Heart, Shield, LogOut, ChevronRight, Lock, Bell, HelpCircle, Loader2, Users, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePosts } from "@/hooks/usePosts";
import { useFriendships } from "@/hooks/useFriendships";
import { Badge } from "@/components/ui/badge";
export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    profile,
    signOut,
    isLoading: authLoading,
    isAdmin
  } = useAuth();
  const {
    posts,
    isLoading: postsLoading
  } = usePosts();
  const {
    friends
  } = useFriendships();
  const [activeTab, setActiveTab] = useState<"posts" | "likes">("posts");
  const [showSettings, setShowSettings] = useState(false);
  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };
  const myPosts = posts.filter(p => p.author_id === profile?.id);
  const totalLikes = myPosts.reduce((sum, post) => sum + post.likes_count, 0);
  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (showSettings) {
    return <SettingsView onBack={() => setShowSettings(false)} onLogout={handleLogout} />;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between text-white">
          <h1 className="text-xl font-gaming font-bold">@{profile?.nick || "Usuario"}</h1>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{
            scale: 0.9
          }} onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 bg-[#3d2f6f] rounded-md border-solid">
        {/* Profile Card */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="glass-card p-6 text-center border-success-foreground px-[2px] py-[20px] bg-white">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-r from-primary via-secondary to-accent p-1 animate-pulse-glow">
              <div className="w-full h-full rounded-full bg-card text-5xl items-center justify-center flex flex-col">
                {(profile?.avatar_data as any)?.emoji || "🎮"}
              </div>
            </div>
            <motion.button whileTap={{
            scale: 0.9
          }} className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shadow-lg">
              <Edit3 className="w-5 h-5" />
            </motion.button>
            
            {/* Level Badge */}
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-warning text-warning-foreground text-xs font-bold">
              Lvl 1
            </div>
          </div>

          {/* Nick & Age Group */}
          <h2 className="text-2xl font-gaming font-bold gradient-text mb-1">
            @{profile?.nick || "Usuario"}
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            Grupo de edad: {profile?.age_group || "13-16"}
          </p>

          {/* Parental Approval Status */}
          {profile?.parent_approved ? <Badge className="bg-success/20 text-success mb-4">
              ✓ Cuenta aprobada
            </Badge> : <Badge variant="secondary" className="bg-warning/20 text-warning mb-4">
              <AlertCircle className="w-3 h-3 mr-1" />
              Pendiente de aprobación
            </Badge>}
          <div className="flex items-center justify-center mb-6 gap-[10px]">
            {["🌟", "🎮", "💪"].map((badge, i) => <div key={i} className="w-10 h-10 rounded-xl bg-card border border-border/50 items-center justify-center text-xl flex flex-row">
                {badge}
              </div>)}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-primary-foreground">
              <p className="font-gaming font-bold gradient-text text-4xl">{myPosts.length}</p>
              <p className="font-bold text-lg text-secondary-foreground">Posts</p>
            </div>
            <div className="p-3 rounded-xl bg-primary-foreground">
              <p className="font-gaming font-bold gradient-text text-4xl">{friends.length}</p>
              <p className="font-bold text-lg text-secondary-foreground">Amigos</p>
            </div>
            <div className="p-3 rounded-xl bg-primary-foreground">
              <p className="font-gaming font-bold text-destructive text-4xl">{totalLikes}</p>
              <p className="text-muted-foreground text-lg font-bold">Likes</p>
            </div>
          </div>
        </motion.div>

        {/* Admin Button */}
        {isAdmin && <motion.button whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }} onClick={() => navigate('/admin')} className="w-full py-3 rounded-xl bg-gradient-to-r from-warning to-destructive font-medium flex items-center justify-center gap-2 text-white">
            <Shield className="w-5 h-5" />
            Panel de Administración
          </motion.button>}

        {/* Actions */}
        <div className="flex gap-3">
          <motion.button whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary font-medium flex items-center justify-center gap-2 text-white">
            <UserPlus className="w-5 h-5" />
            Añadir amigos
          </motion.button>
          <motion.button whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} className="py-3 px-4 rounded-xl border-2 border-border/50 text-muted-foreground hover:text-foreground transition-colors">
            <QrCode className="w-[30px] h-[30px] bg-white" />
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
        {postsLoading ? <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : myPosts.length === 0 ? <div className="text-center py-8">
            <Grid className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No tienes publicaciones aún</p>
          </div> : <div className="grid grid-cols-3 gap-1 border-transparent text-white">
            {myPosts.map((post, i) => <motion.div key={post.id} initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          delay: i * 0.05
        }} className="aspect-square rounded-lg overflow-hidden bg-card">
                {post.content_url ? <img src={post.content_url} alt="" className="w-full h-full border-double border-primary-foreground object-contain border" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Grid className="w-6 h-6" />
                  </div>}
              </motion.div>)}
          </div>}
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
  const {
    profile
  } = useAuth();
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
          <h1 className="text-xl font-gaming font-bold bg-transparent border-white">Ajustes</h1>
        </div>
      </header>

      <div className="p-4 space-y-2">
        {/* User info */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-2xl">
                {(profile?.avatar_data as any)?.emoji || "🎮"}
              </div>
            </div>
            <div>
              <p className="font-semibold">@{profile?.nick || "Usuario"}</p>
              <p className="text-sm text-muted-foreground">{profile?.tutor_email}</p>
            </div>
          </div>
        </div>

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