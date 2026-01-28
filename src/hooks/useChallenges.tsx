import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Challenge {
  id: string;
  description: string;
  challenge_date: string;
  is_active: boolean;
  created_at: string;
  participants_count?: number;
  my_entries_count?: number;
  top_entries?: ChallengeEntry[];
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  content_url: string;
  likes_count: number;
  created_at: string;
  user?: {
    nick: string;
    avatar_data: Record<string, unknown>;
    avatar_snapshot_url?: string | null;
  };
}

export function useChallenges() {
  const { user } = useAuth();
  const [todayChallenge, setTodayChallenge] = useState<Challenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayChallenge = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data: challenge, error: fetchError } = await supabase
        .from('challenges')
        .select('*')
        .eq('challenge_date', today)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching challenge:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (!challenge) {
        setTodayChallenge(null);
        return;
      }

      // Get entries count
      const { count: participantsCount } = await supabase
        .from('challenge_entries')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', challenge.id);

      // Get user's entries count
      let myEntriesCount = 0;
      if (user) {
        const { count } = await supabase
          .from('challenge_entries')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', challenge.id)
          .eq('user_id', user.id);
        myEntriesCount = count || 0;
      }

      // Get top 3 entries
      const { data: topEntries } = await supabase
        .from('challenge_entries')
        .select(`
          *,
          user:profiles!challenge_entries_user_id_fkey(nick, avatar_data, avatar_snapshot_url)
        `)
        .eq('challenge_id', challenge.id)
        .order('likes_count', { ascending: false })
        .limit(3);

      setTodayChallenge({
        ...challenge,
        participants_count: participantsCount || 0,
        my_entries_count: myEntriesCount,
        top_entries: topEntries as ChallengeEntry[]
      });
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar el desafío');
    } finally {
      setIsLoading(false);
    }
  };

  const submitEntry = async (contentUrl: string) => {
    if (!user || !todayChallenge) {
      return { error: new Error('No autenticado o no hay desafío') };
    }

    if ((todayChallenge.my_entries_count || 0) >= 3) {
      return { error: new Error('Has alcanzado el máximo de 3 participaciones') };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('challenge_entries')
        .insert({
          challenge_id: todayChallenge.id,
          user_id: user.id,
          content_url: contentUrl
        })
        .select()
        .single();

      if (insertError) {
        return { error: new Error(insertError.message) };
      }

      await fetchTodayChallenge();
      return { data, error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const likeEntry = async (entryId: string) => {
    try {
      const entry = todayChallenge?.top_entries?.find(e => e.id === entryId);
      if (!entry) return;

      await supabase
        .from('challenge_entries')
        .update({ likes_count: entry.likes_count + 1 })
        .eq('id', entryId);

      await fetchTodayChallenge();
    } catch (err) {
      console.error('Error liking entry:', err);
    }
  };

  useEffect(() => {
    fetchTodayChallenge();

    // Subscribe to entries updates
    const channel = supabase
      .channel('challenge-entries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_entries'
        },
        () => {
          fetchTodayChallenge();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    todayChallenge,
    isLoading,
    error,
    submitEntry,
    likeEntry,
    refreshChallenge: fetchTodayChallenge
  };
}
