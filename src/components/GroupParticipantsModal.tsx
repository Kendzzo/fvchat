import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { FriendRequestButton } from '@/components/FriendRequestButton';
import { Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Participant {
  id: string;
  nick: string;
  profile_photo_url: string | null;
  last_seen_at: string | null;
}

interface GroupParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantIds: string[];
  currentUserId: string;
}

export function GroupParticipantsModal({
  isOpen,
  onClose,
  participantIds,
  currentUserId,
}: GroupParticipantsModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isOpen || participantIds.length === 0) return;

    const fetchParticipants = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nick, profile_photo_url, last_seen_at')
          .in('id', participantIds);

        if (error) {
          console.error('Error fetching participants:', error);
          toast.error('No se pudieron cargar participantes');
          return;
        }

        setParticipants(data || []);
      } catch (err) {
        console.error('Error:', err);
        toast.error('No se pudieron cargar participantes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipants();
  }, [isOpen, participantIds]);

  const content = (
    <div className="flex flex-col h-full">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay participantes</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="space-y-2 p-1">
            {participants.map((participant) => {
              const isCurrentUser = participant.id === currentUserId;
              
              return (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <ProfilePhoto
                    url={participant.profile_photo_url}
                    nick={participant.nick}
                    size="md"
                    showBorder={false}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {participant.nick}
                    </p>
                    {isCurrentUser && (
                      <p className="text-xs text-primary">Tú</p>
                    )}
                  </div>

                  {!isCurrentUser && (
                    <FriendRequestButton
                      targetUserId={participant.id}
                      targetNick={participant.nick}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participantes ({participants.length})
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participantes ({participants.length})
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
