import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, UserCheck, Users } from 'lucide-react';
import { useFriendships, Friendship } from '@/hooks/useFriendships';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function FriendRequestsList() {
  const { pendingRequests, isLoading, acceptFriendRequest, rejectFriendRequest } = useFriendships();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (friendship: Friendship) => {
    setProcessingId(friendship.id);
    const { error } = await acceptFriendRequest(friendship.id);
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`¡Ahora eres amigo de @${friendship.friend?.nick}!`);
    }
    setProcessingId(null);
  };

  const handleReject = async (friendship: Friendship) => {
    setProcessingId(friendship.id);
    const { error } = await rejectFriendRequest(friendship.id);
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success('Solicitud rechazada');
    }
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No tienes solicitudes pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Solicitudes de amistad</h3>
        <Badge variant="secondary">{pendingRequests.length}</Badge>
      </div>

      <AnimatePresence mode="popLayout">
        {pendingRequests.map((request) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-lg">
                  {(request.friend?.avatar_data as any)?.emoji || "👤"}
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">@{request.friend?.nick || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground">{request.friend?.age_group} años</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(request)}
                disabled={processingId === request.id}
                className="h-8 w-8 p-0"
              >
                {processingId === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleAccept(request)}
                disabled={processingId === request.id}
                className="h-8 gap-1"
              >
                {processingId === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Aceptar
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
