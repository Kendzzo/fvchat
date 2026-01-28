import { motion } from 'framer-motion';
import { Crown, Medal, Star, Heart } from 'lucide-react';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import type { ChallengeEntry } from '@/hooks/useChallenges';

interface ChallengePodiumProps {
  entries: ChallengeEntry[];
  onLike?: (entryId: string) => void;
  currentUserId?: string;
}

export function ChallengePodium({ entries, onLike, currentUserId }: ChallengePodiumProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🏆</div>
        <p className="text-muted-foreground">¡Sé el primero en participar!</p>
      </div>
    );
  }

  // Reorder for visual podium: 2nd, 1st, 3rd
  const podiumOrder = [1, 0, 2];
  const orderedEntries = podiumOrder.map(i => entries[i]).filter(Boolean);

  const getPositionStyle = (index: number) => {
    switch (index) {
      case 0: // 2nd place (left)
        return { height: '120px', bg: 'bg-slate-300', icon: <Medal className="w-6 h-6 text-slate-600" /> };
      case 1: // 1st place (center)
        return { height: '160px', bg: 'bg-yellow-400', icon: <Crown className="w-8 h-8 text-yellow-700" /> };
      case 2: // 3rd place (right)
        return { height: '100px', bg: 'bg-orange-300', icon: <Star className="w-5 h-5 text-orange-600" /> };
      default:
        return { height: '80px', bg: 'bg-muted', icon: null };
    }
  };

  const getPosition = (index: number) => {
    switch (index) {
      case 0: return 2;
      case 1: return 1;
      case 2: return 3;
      default: return index + 1;
    }
  };

  return (
    <div className="flex items-end justify-center gap-2 py-4">
      {orderedEntries.map((entry, displayIndex) => {
        const style = getPositionStyle(displayIndex);
        const position = getPosition(displayIndex);
        const isCenter = displayIndex === 1;
        
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: displayIndex * 0.1 }}
            className={`flex flex-col items-center ${isCenter ? 'order-2' : displayIndex === 0 ? 'order-1' : 'order-3'}`}
          >
            {/* Avatar and info */}
            <div className="flex flex-col items-center mb-2">
              <div className={`relative ${isCenter ? 'scale-110' : ''}`}>
                <ProfilePhoto
                  url={entry.user?.avatar_snapshot_url}
                  nick={entry.user?.nick || 'Usuario'}
                  size={isCenter ? 'xl' : 'lg'}
                  className="ring-2 ring-white shadow-lg"
                />
                <div className="absolute -top-2 -right-2">
                  {style.icon}
                </div>
              </div>
              <p className={`font-semibold mt-1 text-center truncate max-w-[80px] ${isCenter ? 'text-base' : 'text-sm'}`}>
                @{entry.user?.nick || 'Usuario'}
              </p>
            </div>

            {/* Like button */}
            {onLike && entry.user_id !== currentUserId && (
              <button
                onClick={() => onLike(entry.id)}
                className="flex items-center gap-1 mb-2 px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm shadow-sm hover:bg-card transition-colors"
              >
                <Heart 
                  className={`w-4 h-4 transition-colors ${entry.is_liked ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} 
                />
                <span className="text-sm font-medium">{entry.likes_count}</span>
              </button>
            )}

            {/* Podium block */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: style.height }}
              transition={{ delay: 0.3 + displayIndex * 0.1, duration: 0.5, ease: 'easeOut' }}
              className={`${style.bg} rounded-t-xl flex items-start justify-center pt-3 shadow-lg`}
              style={{ width: isCenter ? '100px' : '80px' }}
            >
              <span className={`font-gaming font-bold ${isCenter ? 'text-3xl' : 'text-2xl'} text-white drop-shadow-md`}>
                #{position}
              </span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
