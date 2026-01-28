import { motion } from 'framer-motion';
import { Sparkles, Clock, Users, Trophy } from 'lucide-react';
import type { Challenge } from '@/hooks/useChallenges';

interface ChallengeBannerProps {
  challenge: Challenge;
  timeRemaining: string;
  onParticipate: () => void;
  canParticipate: boolean;
}

export function ChallengeBanner({ 
  challenge, 
  timeRemaining, 
  onParticipate, 
  canParticipate 
}: ChallengeBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/10 border border-primary/30"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-secondary/20">
              <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
            </div>
            <span className="text-sm font-gaming font-bold text-secondary uppercase tracking-wider">
              Desafío del día
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/20 text-warning">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm font-mono font-bold">{timeRemaining}</span>
          </div>
        </div>

        {/* Challenge description */}
        <h2 className="text-xl font-gaming font-bold mb-4">
          {challenge.description}
        </h2>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">{challenge.participants_count || 0} participantes</span>
          </div>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-full ${i < (challenge.my_entries_count || 0) ? "bg-primary" : "bg-muted"}`} 
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {challenge.my_entries_count || 0}/3
            </span>
          </div>
        </div>

        {/* Rewards preview */}
        {challenge.rewards && challenge.rewards.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-warning" />
            <div className="flex gap-1">
              {challenge.rewards.map((reward, i) => (
                <span key={i} className="text-xl">
                  {reward.sticker?.emoji || '🎁'}
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Premios para el Top 3</span>
          </div>
        )}

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onParticipate}
          disabled={!canParticipate}
          className="w-full btn-gaming py-3 rounded-2xl font-gaming text-base disabled:opacity-50"
        >
          {!canParticipate 
            ? '¡Ya participaste 3 veces!' 
            : '🎯 ¡Participar ahora!'}
        </motion.button>
      </div>
    </motion.div>
  );
}
