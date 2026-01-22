import { motion } from "framer-motion";
import { useState } from "react";
import { Trophy, Clock, Users, Sparkles, ChevronRight, Star, Medal, Crown } from "lucide-react";

// Mock challenge data
const todayChallenge = {
  id: "1",
  title: "¡Cara de sorpresa!",
  description: "Muestra tu mejor cara de sorpresa 😮 ¡Sé creativo!",
  endsIn: "18h 32min",
  participants: 1234,
  myParticipations: 1,
  maxParticipations: 3,
  topParticipants: [{
    rank: 1,
    nick: "GamerPro",
    avatar: "🎮",
    likes: 342
  }, {
    rank: 2,
    nick: "ArtistaDigital",
    avatar: "🎨",
    likes: 289
  }, {
    rank: 3,
    nick: "SkaterKid",
    avatar: "🛹",
    likes: 245
  }]
};
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
  const [showParticipate, setShowParticipate] = useState(false);
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

      <div className="p-4 space-y-6 bg-[#3d2f6f]">
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
            <h2 className="text-2xl font-gaming font-bold mb-2">{todayChallenge.title}</h2>
            <p className="text-muted-foreground mb-6">{todayChallenge.description}</p>

            {/* Stats */}
            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />
                <span className="text-sm text-warning font-medium">{todayChallenge.endsIn}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{todayChallenge.participants} participantes</span>
              </div>
            </div>

            {/* Participation info */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm">
                <span className="text-muted-foreground">Participaciones: </span>
                <span className="text-foreground font-semibold">
                  {todayChallenge.myParticipations}/{todayChallenge.maxParticipations}
                </span>
              </div>
              <div className="flex gap-1">
                {[...Array(todayChallenge.maxParticipations)].map((_, i) => <div key={i} className={`w-3 h-3 rounded-full ${i < todayChallenge.myParticipations ? "bg-secondary" : "bg-muted"}`} />)}
              </div>
            </div>

            {/* CTA */}
            <motion.button whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} onClick={() => setShowParticipate(true)} disabled={todayChallenge.myParticipations >= todayChallenge.maxParticipations} className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg disabled:opacity-50">
              {todayChallenge.myParticipations >= todayChallenge.maxParticipations ? "Ya has participado 3 veces" : "¡Participar ahora!"}
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
            {todayChallenge.topParticipants.map((participant, index) => <motion.div key={participant.rank} initial={{
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
                    {participant.avatar}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">@{participant.nick}</p>
                  <p className="text-xs text-muted-foreground">{participant.likes} likes</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${index === 0 ? "bg-warning text-warning-foreground" : index === 1 ? "bg-muted text-muted-foreground" : "bg-orange-500/20 text-orange-400"}`}>
                  #{participant.rank}
                </div>
              </motion.div>)}
          </div>
        </motion.div>

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
          }} className="text-center p-4 rounded-xl bg-card border border-border/50">
                <div className="text-4xl mb-2">{reward.emoji}</div>
                <p className="text-xs font-medium truncate">{reward.name}</p>
                <p className={`text-[10px] mt-1 ${reward.rarity === "Legendario" ? "text-warning" : reward.rarity === "Épico" ? "text-primary" : "text-secondary"}`}>
                  {reward.rarity}
                </p>
              </motion.div>)}
          </div>
        </motion.div>

        {/* Info */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            El desafío se reinicia cada día a las 00:00 (Madrid)
          </p>
        </div>
      </div>
    </div>;
}