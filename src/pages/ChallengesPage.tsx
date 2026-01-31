import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Trophy,
  Clock,
  Users,
  Sparkles,
  ChevronRight,
  Star,
  Medal,
  Crown,
  Loader2,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { useChallenges } from "@/hooks/useChallenges";
import { useAuth } from "@/hooks/useAuth";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { ChallengeParticipateModal } from "@/components/challenges/ChallengeParticipateModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Define sticker type for daily rewards
interface DailyRewardSticker {
  id: string;
  name: string;
  image_url: string | null;
  rarity: string;
}

// Generate consistent daily rewards based on date seed
function getDailyRewardsSeed(date: Date): number {
  const dateStr = date.toISOString().split("T")[0];
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
export default function ChallengesPage() {
  const {
    todayChallenge,
    isLoading,
    error,
    submitEntry,
    likeEntry,
    generateTodayChallenge,
    ensureTodayChallenge,
    refreshChallenge,
  } = useChallenges();
  const { isAdmin, user } = useAuth();
  const [showParticipate, setShowParticipate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dailyStickers, setDailyStickers] = useState<DailyRewardSticker[]>([]);
  const [stickersLoading, setStickersLoading] = useState(true);
  const hasEnsured = useRef(false);

  // Auto-ensure challenge exists on mount
  useEffect(() => {
    if (!hasEnsured.current && user) {
      hasEnsured.current = true;
      ensureTodayChallenge();
    }
  }, [user, ensureTodayChallenge]);

  // Fetch daily stickers for rewards
  useEffect(() => {
    const fetchDailyStickers = async () => {
      try {
        // Get all available stickers
        const { data: stickers, error: stickersError } = await supabase
          .from("stickers")
          .select("id, name, image_url, rarity")
          .order("created_at", { ascending: false });

        if (stickersError) {
          console.error("Error fetching stickers:", stickersError);
          setStickersLoading(false);
          return;
        }

        if (stickers && stickers.length >= 3) {
          // Use date seed to consistently select 3 stickers for today
          const seed = getDailyRewardsSeed(new Date());
          const selectedIndices = new Set<number>();

          // Select 3 unique stickers using the seed
          let seedOffset = 0;
          while (selectedIndices.size < 3 && seedOffset < stickers.length * 2) {
            const idx = (seed + seedOffset) % stickers.length;
            selectedIndices.add(idx);
            seedOffset++;
          }

          const selectedStickers = Array.from(selectedIndices)
            .slice(0, 3)
            .map((idx) => stickers[idx]);
          setDailyStickers(selectedStickers);
        } else if (stickers && stickers.length > 0) {
          // Use what we have
          setDailyStickers(stickers.slice(0, 3));
        }
      } catch (err) {
        console.error("Error loading daily stickers:", err);
      } finally {
        setStickersLoading(false);
      }
    };

    fetchDailyStickers();
  }, []);

  // Handle manual retry
  const handleRetry = async () => {
    setIsGenerating(true);
    try {
      await ensureTodayChallenge();
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle admin manual generation
  const handleAdminGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateTodayChallenge();
      await refreshChallenge();
    } finally {
      setIsGenerating(false);
    }
  };

  // Use real rewards if available from challenge, otherwise use daily stickers
  const displayRewards =
    todayChallenge?.rewards && todayChallenge.rewards.length > 0
      ? todayChallenge.rewards.map((r, idx) => ({
          id: r.id,
          name: r.sticker?.name || r.avatar_item?.name || `Premio ${idx + 1}`,
          image_url: r.sticker?.image_url || null,
          rarity: r.sticker?.rarity || r.avatar_item?.rarity || "Común",
        }))
      : dailyStickers.length > 0
        ? dailyStickers.map((s, idx) => ({
            id: s.id,
            name: s.name,
            image_url: s.image_url,
            rarity: idx === 0 ? "Épico" : idx === 1 ? "Raro" : "Común",
          }))
        : [
            { id: "1", name: "Premio 1º", image_url: null, rarity: "Épico" },
            { id: "2", name: "Premio 2º", image_url: null, rarity: "Raro" },
            { id: "3", name: "Premio 3º", image_url: null, rarity: "Común" },
          ];

  const handleSubmitEntry = async (contentUrl: string, visibility: "friends" | "public" = "public") => {
    const { error } = await submitEntry(contentUrl, visibility);
    if (error) {
      toast.error(error.message);
      return {
        error,
      };
    }
    setShowParticipate(false);
    return {};
  };
  const getTimeRemaining = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };
  return (
    <div className="min-h-screen bg-[#e8e6ff]">
      {/* Challenge Participate Modal */}
      {todayChallenge && (
        <ChallengeParticipateModal
          isOpen={showParticipate}
          onClose={() => setShowParticipate(false)}
          challengeId={todayChallenge.id}
          challengeTitle={todayChallenge.description}
          onSubmit={handleSubmitEntry}
          entriesRemaining={3 - (todayChallenge.my_entries_count || 0)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-[19px]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-gaming font-bold gradient-text">Desafíos</h1>
          <div className="badge-safe">
            <Trophy className="w-3 h-3" />
            Nivel 5
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 bg-[#e8e6ff]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : todayChallenge ? (
          <>
            {/* Today's Challenge */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="relative overflow-hidden rounded-3xl"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-neon-purple to-secondary opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

              <div className="relative p-6 bg-white border-primary">
                {/* Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                  <span className="text-sm font-gaming font-bold text-secondary uppercase tracking-wider">
                    Desafío del día
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-gaming font-bold mb-2 text-secondary-foreground">
                  {todayChallenge.description}
                </h2>

                {/* Stats */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-destructive">{getTimeRemaining()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-black bg-transparent" />
                    <span className="text-sm text-secondary-foreground">
                      {todayChallenge.participants_count || 0} participantes
                    </span>
                  </div>
                </div>

                {/* Participation info */}
                <div className="flex items-center justify-between mb-6 text-black">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Participaciones: </span>
                    <span className="text-foreground font-semibold">{todayChallenge.my_entries_count || 0}/3</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${i < (todayChallenge.my_entries_count || 0) ? "bg-secondary" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <motion.button
                  whileHover={{
                    scale: 1.02,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={() => setShowParticipate(true)}
                  disabled={(todayChallenge.my_entries_count || 0) >= 3}
                  className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg disabled:opacity-50"
                >
                  {(todayChallenge.my_entries_count || 0) >= 3 ? "Ya has participado 3 veces" : "¡Participar ahora!"}
                </motion.button>
              </div>
            </motion.div>

            {/* Top 3 Ranking */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.1,
              }}
              className="glass-card p-6 border-success-foreground"
            >
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
                {(todayChallenge.top_entries || []).length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">¡Sé el primero en participar!</p>
                  </div>
                ) : (
                  todayChallenge.top_entries?.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{
                        opacity: 0,
                        x: -20,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay: 0.2 + index * 0.1,
                      }}
                      className={`flex items-center gap-4 p-3 rounded-xl ${index === 0 ? "bg-warning/10 border border-warning/30" : index === 1 ? "bg-muted/50 border border-border/50" : "bg-card border border-border/30"}`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg">
                        {index === 0 ? (
                          <Crown className="w-6 h-6 text-warning" />
                        ) : index === 1 ? (
                          <Medal className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <Star className="w-6 h-6 text-orange-400" />
                        )}
                      </div>
                      <ProfilePhoto
                        url={entry.user?.avatar_snapshot_url}
                        nick={entry.user?.nick || "Usuario"}
                        size="lg"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">@{entry.user?.nick || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground">{entry.likes_count} likes</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${index === 0 ? "bg-warning text-warning-foreground" : index === 1 ? "bg-muted text-muted-foreground" : "bg-orange-500/20 text-orange-400"}`}
                      >
                        #{index + 1}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        ) : (
          <div className="glass-card p-8 text-center py-[50px]">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-gaming font-bold text-xl mb-2">No hay desafío activo</h3>
            <p className="text-muted-foreground mb-4">{error || "¡Vuelve mañana para el próximo desafío!"}</p>
            <motion.button
              whileHover={{
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.98,
              }}
              onClick={handleRetry}
              disabled={isGenerating}
              className="btn-gaming px-6 py-3 rounded-xl text-foreground font-gaming inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reintentar
            </motion.button>
          </div>
        )}

        {/* Admin Generate Button */}
        {isAdmin && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="glass-card p-4 border-warning/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-warning">Admin</span>
              </div>
              <motion.button
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                onClick={handleAdminGenerate}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg bg-warning/20 text-warning font-medium text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generar desafío (admin)
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Rewards */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
          }}
          className="glass-card p-6 border-success-foreground py-[21px]"
        >
          <h3 className="font-gaming font-bold mb-4 flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-secondary" />
            Recompensas de hoy
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {displayRewards.map((reward, index) => (
              <motion.div
                key={reward.id}
                initial={{
                  opacity: 0,
                  scale: 0.9,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  delay: 0.3 + index * 0.1,
                }}
                className="text-center p-4 rounded-xl border border-border/50 bg-white"
              >
                <div className="mb-2 flex items-center justify-center px-[10px] py-[10px]">
                  {reward.image_url ? (
                    <img src={reward.image_url} alt={reward.name} className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-primary" />
                    </div>
                  )}
                </div>
                <p className="font-medium truncate text-secondary-foreground text-base">{reward.name}</p>
                <p
                  className={`text-[15px] mt-1 ${reward.rarity === "Legendario" || reward.rarity === "legendary" ? "text-warning" : reward.rarity === "Épico" || reward.rarity === "epic" ? "text-primary" : "text-secondary"}`}
                >
                  {reward.rarity === "epic"
                    ? "Épico"
                    : reward.rarity === "rare"
                      ? "Raro"
                      : reward.rarity === "common"
                        ? "Común"
                        : reward.rarity === "legendary"
                          ? "Legendario"
                          : reward.rarity}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Info */}
        <div className="text-center py-4">
          <p className="text-xs text-secondary-foreground">El desafío se reinicia cada día a las 00:00 (Madrid)</p>
        </div>
      </div>
    </div>
  );
}
