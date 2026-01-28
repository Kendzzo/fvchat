import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const HEARTBEAT_INTERVAL = 60000; // 60 seconds

export function usePresence() {
  const { user } = useAuth();

  const updatePresence = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Update immediately when hook mounts
    updatePresence();

    // Set up heartbeat interval
    const interval = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, updatePresence]);

  return { updatePresence };
}

export function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Sin conexión reciente';

  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 2) {
    return 'En línea';
  }

  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) {
    return `Visto hace ${diffMinutes} min`;
  }

  if (diffHours < 24) {
    return `Visto hace ${diffHours}h`;
  }

  if (diffDays === 1) {
    return `Visto ayer a las ${lastSeen.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return `Visto el ${lastSeen.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
}

export function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  return diffMs < 120000; // 2 minutes
}
