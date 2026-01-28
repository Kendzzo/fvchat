import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, User, VolumeX, Volume2, Ban, Flag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatActions } from '@/hooks/useChatActions';
import { Chat } from '@/hooks/useChats';
import { useAuth } from '@/hooks/useAuth';

interface ChatOptionsMenuProps {
  chat: Chat;
  otherUserId: string | null;
}

export function ChatOptionsMenu({ chat, otherUserId }: ChatOptionsMenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { muteChat, blockUser, unblockUser, reportUser, getChatSettings, isUserBlocked, isLoading } = useChatActions();
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!chat.id || !otherUserId) return;

      const settings = await getChatSettings(chat.id);
      setIsMuted(settings?.muted || false);

      const blocked = await isUserBlocked(otherUserId);
      setIsBlocked(blocked);
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, chat.id, otherUserId]);

  const handleViewProfile = () => {
    if (otherUserId) {
      navigate(`/app/profile/${otherUserId}`);
    }
    setIsOpen(false);
  };

  const handleMuteToggle = async () => {
    await muteChat(chat.id, !isMuted);
    setIsMuted(!isMuted);
    setIsOpen(false);
  };

  const handleBlockToggle = async () => {
    if (!otherUserId) return;
    
    if (isBlocked) {
      await unblockUser(otherUserId);
    } else {
      await blockUser(otherUserId);
    }
    setIsBlocked(!isBlocked);
    setIsOpen(false);
  };

  const handleReport = async () => {
    if (!otherUserId) return;
    await reportUser(otherUserId, chat.id);
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-white" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 safe-bottom"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border/30">
                <h3 className="font-semibold text-lg">Opciones del chat</h3>
                <button onClick={() => setIsOpen(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Options */}
              <div className="p-4 space-y-2">
                {/* View Profile - only for 1:1 chats */}
                {!chat.is_group && otherUserId && (
                  <button
                    onClick={handleViewProfile}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-background hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">Ver perfil</span>
                  </button>
                )}

                {/* Mute Chat */}
                <button
                  onClick={handleMuteToggle}
                  disabled={isLoading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-background hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                    {isMuted ? (
                      <Volume2 className="w-5 h-5 text-warning" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-warning" />
                    )}
                  </div>
                  <span className="font-medium">
                    {isMuted ? 'Desilenciar chat' : 'Silenciar chat'}
                  </span>
                </button>

                {/* Block User - only for 1:1 chats */}
                {!chat.is_group && otherUserId && (
                  <button
                    onClick={handleBlockToggle}
                    disabled={isLoading}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-background hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <Ban className="w-5 h-5 text-destructive" />
                    </div>
                    <span className="font-medium">
                      {isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                    </span>
                  </button>
                )}

                {/* Report */}
                {!chat.is_group && otherUserId && (
                  <button
                    onClick={handleReport}
                    disabled={isLoading}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-background hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                      <Flag className="w-5 h-5 text-secondary" />
                    </div>
                    <span className="font-medium">Reportar</span>
                  </button>
                )}
              </div>

              {/* Extra padding for safe area */}
              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
