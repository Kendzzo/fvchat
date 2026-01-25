import { useState, useEffect } from 'react';
import { useFriendships } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Clock, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FriendRequestButtonProps {
  targetUserId: string;
  targetNick: string;
}

export function FriendRequestButton({ targetUserId, targetNick }: FriendRequestButtonProps) {
  const { user, profile } = useAuth();
  const { sendFriendRequest, friends } = useFriendships();
  const [status, setStatus] = useState<'none' | 'pending' | 'friend' | 'loading'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSendRequest = profile?.parent_approved === true;

  useEffect(() => {
    const checkStatus = async () => {
      if (!user || user.id === targetUserId) {
        setStatus('none');
        return;
      }

      // Check if already friends
      const isFriend = friends.some(f => 
        f.friend?.id === targetUserId
      );

      if (isFriend) {
        setStatus('friend');
        return;
      }

      // Check for pending request
      const { data } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (data?.status === 'pending') {
        setStatus('pending');
      } else if (data?.status === 'approved') {
        setStatus('friend');
      } else {
        setStatus('none');
      }
    };

    checkStatus();
  }, [user, targetUserId, friends]);

  const handleSendRequest = async () => {
    if (!canSendRequest) {
      toast.error('Necesitas aprobación parental para añadir amigos');
      return;
    }

    setIsSubmitting(true);
    const { error } = await sendFriendRequest(targetUserId);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Solicitud enviada a ${targetNick}`);
      setStatus('pending');
    }
  };

  if (user?.id === targetUserId) {
    return null;
  }

  if (!canSendRequest) {
    return (
      <Button size="sm" variant="outline" disabled className="gap-1">
        <Lock className="w-4 h-4" />
        Bloqueado
      </Button>
    );
  }

  switch (status) {
    case 'loading':
      return (
        <Button size="sm" variant="outline" disabled>
          <Clock className="w-4 h-4 animate-spin" />
        </Button>
      );
    case 'friend':
      return (
        <Button size="sm" variant="secondary" disabled className="gap-1">
          <UserCheck className="w-4 h-4" />
          Amigos
        </Button>
      );
    case 'pending':
      return (
        <Button size="sm" variant="outline" disabled className="gap-1">
          <Clock className="w-4 h-4" />
          Pendiente
        </Button>
      );
    default:
      return (
        <Button 
          size="sm" 
          onClick={handleSendRequest}
          disabled={isSubmitting}
          className="gap-1"
        >
          <UserPlus className="w-4 h-4" />
          Añadir
        </Button>
      );
  }
}
