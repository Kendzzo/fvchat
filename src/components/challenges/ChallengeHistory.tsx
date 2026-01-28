import { motion } from 'framer-motion';
import { Calendar, Trophy, Crown, Medal, Star } from 'lucide-react';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import type { Challenge } from '@/hooks/useChallenges';

interface ChallengeHistoryProps {
  challenges: Challenge[];
}

export function ChallengeHistory({ challenges }: ChallengeHistoryProps) {
  if (challenges.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No hay desafíos anteriores</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 0: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 1: return <Medal className="w-4 h-4 text-slate-400" />;
      case 2: return <Star className="w-4 h-4 text-orange-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {challenges.map((challenge, index) => (
        <motion.div
          key={challenge.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="glass-card p-4 rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">
                {formatDate(challenge.challenge_date)}
              </span>
            </div>
            {challenge.participants_count && (
              <span className="text-xs text-muted-foreground">
                {challenge.participants_count} participantes
              </span>
            )}
          </div>

          {/* Description */}
          <p className="font-medium mb-3">{challenge.description}</p>

          {/* Winners */}
          {challenge.top_entries && challenge.top_entries.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ganadores:</span>
              <div className="flex -space-x-2">
                {challenge.top_entries.slice(0, 3).map((entry, i) => (
                  <div key={i} className="relative">
                    <ProfilePhoto
                      url={entry.user?.avatar_snapshot_url}
                      nick={entry.user?.nick || 'Usuario'}
                      size="sm"
                      className="ring-2 ring-card"
                    />
                    <div className="absolute -top-1 -right-1">
                      {getPositionIcon(i)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
