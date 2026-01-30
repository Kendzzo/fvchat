import { useState, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, User, VolumeX, Volume2, Ban, Flag, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChatActions } from '@/hooks/useChatActions';
import { Chat } from '@/hooks/useChats';
import { useAuth } from '@/hooks/useAuth';

interface ChatOptionsMenuProps {
  chat: Chat;
  otherUserId: string | null;
}

export const ChatOptionsMenu = memo(function ChatOptionsMenu({ chat, otherUserId }: ChatOptionsMenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { muteChat, blockUser, unblockUser, reportUser, getChatSettings, isUserBlocked, isLoading } = useChatActions();
  const [open, setOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load settings only when menu opens
  useEffect(() => {
    const loadSettings = async () => {
      if (!open || settingsLoaded || !chat.id) return;

      const settings = await getChatSettings(chat.id);
      setIsMuted(settings?.muted || false);

      if (otherUserId) {
        const blocked = await isUserBlocked(otherUserId);
        setIsBlocked(blocked);
      }
      setSettingsLoaded(true);
    };

    loadSettings();
  }, [open, chat.id, otherUserId, settingsLoaded, getChatSettings, isUserBlocked]);

  // Reset settings loaded when menu closes (for next open to refresh)
  useEffect(() => {
    if (!open) {
      setSettingsLoaded(false);
    }
  }, [open]);

  const handleViewProfile = useCallback(() => {
    if (otherUserId) {
      console.log('[ChatOptionsMenu] Navigating to profile:', otherUserId);
      navigate(`/u/${otherUserId}`);
    } else {
      console.warn('[ChatOptionsMenu] No otherUserId available');
    }
    setOpen(false);
  }, [otherUserId, navigate]);

  const handleMuteToggle = useCallback(async () => {
    await muteChat(chat.id, !isMuted);
    setIsMuted(!isMuted);
    setOpen(false);
  }, [chat.id, isMuted, muteChat]);

  const handleBlockToggle = useCallback(async () => {
    if (!otherUserId) return;
    
    if (isBlocked) {
      await unblockUser(otherUserId);
    } else {
      await blockUser(otherUserId);
    }
    setIsBlocked(!isBlocked);
    setOpen(false);
  }, [otherUserId, isBlocked, blockUser, unblockUser]);

  const handleReport = useCallback(async () => {
    if (!otherUserId) return;
    await reportUser(otherUserId, chat.id);
    setOpen(false);
  }, [otherUserId, chat.id, reportUser]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button 
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreVertical className="w-5 h-5 text-white" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 z-[999] bg-card border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
        sideOffset={8}
      >
        {/* View Profile - only for 1:1 chats */}
        {!chat.is_group && otherUserId && (
          <DropdownMenuItem 
            onClick={handleViewProfile}
            className="flex items-center gap-3 py-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span>Ver perfil</span>
          </DropdownMenuItem>
        )}

        {/* Mute Chat */}
        <DropdownMenuItem 
          onClick={handleMuteToggle}
          disabled={isLoading}
          className="flex items-center gap-3 py-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
            {isMuted ? (
              <Volume2 className="w-4 h-4 text-warning" />
            ) : (
              <VolumeX className="w-4 h-4 text-warning" />
            )}
          </div>
          <span>{isMuted ? 'Desilenciar chat' : 'Silenciar chat'}</span>
        </DropdownMenuItem>

        {/* Block User - only for 1:1 chats */}
        {!chat.is_group && otherUserId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleBlockToggle}
              disabled={isLoading}
              className="flex items-center gap-3 py-3 cursor-pointer text-destructive focus:text-destructive"
            >
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                <Ban className="w-4 h-4 text-destructive" />
              </div>
              <span>{isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}</span>
            </DropdownMenuItem>
          </>
        )}

        {/* Report */}
        {!chat.is_group && otherUserId && (
          <DropdownMenuItem 
            onClick={handleReport}
            disabled={isLoading}
            className="flex items-center gap-3 py-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
              <Flag className="w-4 h-4 text-secondary" />
            </div>
            <span>Reportar</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
