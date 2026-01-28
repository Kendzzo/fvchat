import { motion } from 'framer-motion';
import { Heart, Play } from 'lucide-react';
import { AvatarBadge } from '@/components/avatar/AvatarBadge';
import type { ChallengeEntry } from '@/hooks/useChallenges';

interface ChallengeEntriesListProps {
  entries: ChallengeEntry[];
  onLike: (entryId: string) => void;
  currentUserId?: string;
}

export function ChallengeEntriesList({ entries, onLike, currentUserId }: ChallengeEntriesListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Aún no hay participaciones</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {entries.map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="relative rounded-2xl overflow-hidden bg-card shadow-md"
        >
          {/* Content */}
          <div className="aspect-square relative">
            {entry.content_url.includes('video') || entry.content_url.endsWith('.mp4') || entry.content_url.endsWith('.mov') ? (
              <>
                <video
                  src={entry.content_url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                    <Play className="w-5 h-5 text-foreground ml-0.5" />
                  </div>
                </div>
              </>
            ) : (
              <img 
                src={entry.content_url} 
                alt="" 
                className="w-full h-full object-cover"
              />
            )}

            {/* Rank badge for top 3 */}
            {index < 3 && (
              <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                index === 1 ? 'bg-slate-300 text-slate-700' :
                'bg-orange-300 text-orange-800'
              }`}>
                {index + 1}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <AvatarBadge
                avatarUrl={entry.user?.avatar_snapshot_url}
                nick={entry.user?.nick || 'Usuario'}
                size="sm"
              />
              <span className="text-sm truncate">@{entry.user?.nick || 'Usuario'}</span>
            </div>
            
            {entry.user_id !== currentUserId && (
              <button
                onClick={() => onLike(entry.id)}
                className="flex items-center gap-1 p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <Heart 
                  className={`w-4 h-4 ${entry.is_liked ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} 
                />
                <span className="text-xs font-medium">{entry.likes_count}</span>
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
