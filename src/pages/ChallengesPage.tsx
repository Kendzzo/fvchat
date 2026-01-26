import { motion } from "framer-motion";
import { useState } from "react";
import { Trophy, Clock, Users, Sparkles, ChevronRight, Star, Medal, Crown, Loader2 } from "lucide-react";
import { useChallenges } from "@/hooks/useChallenges";
const rewards = [{
  id: "1",
  name: "Gorra Épica",
  emoji: "🧢",
  rarity: "Épico"
}, {
  id: "2",
  name: "Gafas Neón",
  emoji: "🕶️",
  rarity: "Raro"
}, {
  id: "3",
  name: "Alas Brillantes",
  emoji: "🦋",
  rarity: "Legendario"
}];
export default function ChallengesPage() {
  const {
    todayChallenge,
    isLoading,
    submitEntry,
    likeEntry
  } = useChallenges();
  const [showParticipate, setShowParticipate] = useState(false);
  const getTimeRemaining = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-gaming font-bold gradient-text">Desafíos</h1>
          <div className="badge-safe">
            <Trophy className="w-3 h-3" />
            Nivel 5
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 bg-[#e8e6ff]">
        {isLoading ? <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : todayChallenge ? <>
            {/* Today's Challenge */}
            <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="relative overflow-hidden rounded-3xl">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-neon-purple to-secondary opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

              <div className="relative p-6">
                {/* Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                  <span className="text-sm font-gaming font-bold text-secondary uppercase tracking-wider">
                    Desafío del día
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-gaming font-bold mb-2">{todayChallenge.description}</h2>

                {/* Stats */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warning" />
                    <span className="text-sm text-warning font-medium">{getTimeRemaining()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {todayChallenge.participants_count || 0} participantes
                    </span>
                  </div>
                </div>

                {/* Participation info */}
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Participaciones: </span>
                    <span className="text-foreground font-semibold">
                      {todayChallenge.my_entries_count || 0}/3
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => <div key={i} className={`w-3 h-3 rounded-full ${i < (todayChallenge.my_entries_count || 0) ? "bg-secondary" : "bg-muted"}`} />)}
                  </div>
                </div>

                {/* CTA */}
                <motion.button whileHover={{
              scale: 1.02
            }} whileTap={{
              scale: 0.98
            }} onClick={() => setShowParticipate(true)} disabled={(todayChallenge.my_entries_count || 0) >= 3} className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg disabled:opacity-50">
                  {(todayChallenge.my_entries_count || 0) >= 3 ? "Ya has participado 3 veces" : "¡Participar ahora!"}
                </motion.button>
              </div>
            </motion.div>

            {/* Top 3 Ranking */}
            <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.1
        }} className="glass-card p-6 border-success-foreground">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-gaming font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-warning" />
                  Top 3 del desafío
                </h3>
                <button className="text-sm text-primary flex items-center gap-1">
                  Ver todo <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {(todayChallenge.top_entries || []).length === 0 ? <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      ¡Sé el primero en participar!
                    </p>
                  </div> : todayChallenge.top_entries?.map((entry, index) => <motion.div key={entry.id} initial={{
              opacity: 0,
              x: -20
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              delay: 0.2 + index * 0.1
            }} className={`flex items-center gap-4 p-3 rounded-xl ${index === 0 ? "bg-warning/10 border border-warning/30" : index === 1 ? "bg-muted/50 border border-border/50" : "bg-card border border-border/30"}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg">
                        {index === 0 ? <Crown className="w-6 h-6 text-warning" /> : index === 1 ? <Medal className="w-6 h-6 text-muted-foreground" /> : <Star className="w-6 h-6 text-orange-400" />}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                        <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-xl">
                          {(entry.user?.avatar_data as any)?.emoji || "👤"}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">@{entry.user?.nick || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground">{entry.likes_count} likes</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${index === 0 ? "bg-warning text-warning-foreground" : index === 1 ? "bg-muted text-muted-foreground" : "bg-orange-500/20 text-orange-400"}`}>
                        #{index + 1}
                      </div>
                    </motion.div>)}
              </div>
            </motion.div>
          </> : <div className="glass-card p-8 text-center">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-gaming font-bold text-xl mb-2">No hay desafío activo</h3>
            <p className="text-muted-foreground">
              ¡Vuelve mañana para el próximo desafío!
            </p>
          </div>}

        {/* Rewards */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.2
      }} className="glass-card p-6 border-success-foreground">
          <h3 className="font-gaming font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            Recompensas de hoy
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {rewards.map((reward, index) => <motion.div key={reward.id} initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            delay: 0.3 + index * 0.1
          }} className="text-center p-4 rounded-xl border border-border/50 bg-white">
                <div className="text-4xl mb-2 px-[10px] py-[10px]">{reward.emoji}</div>
                <p className="font-medium truncate text-secondary-foreground text-base">{reward.name}</p>
                <p className={`text-[10px] mt-1 ${reward.rarity === "Legendario" ? "text-warning" : reward.rarity === "Épico" ? "text-primary" : "text-secondary"}`}>
                  {reward.rarity}
                </p>
              </motion.div>)}
          </div>
        </motion.div>

        {/* Info */}
        <div className="text-center py-4">
          <p className="text-xs text-secondary-foreground">
            El desafío se reinicia cada día a las 00:00 (Madrid)
          </p>
        </div>
      </div>
    </div>;
}