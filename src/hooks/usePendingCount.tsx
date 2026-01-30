import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePendingCount() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingCount = useCallback(async () => {
    if (!user) {
      setPendingCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // Count pending friend requests where user is the receiver
      const { count, error } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching pending count:', error);
        return;
      }

      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error calculating pending count:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingCount();

    // Subscribe to friendship changes
    const channel = supabase
      .channel('pending-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingCount]);

  return {
    pendingCount,
    isLoading,
    refreshPendingCount: fetchPendingCount
  };
}
