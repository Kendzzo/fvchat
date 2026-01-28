import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Challenge {
  id: string;
  title: string | null;
  description: string;
  challenge_date: string;
  is_active: boolean;
  created_at: string;
  generated_by?: string | null;
  rewards_assigned?: boolean | null;
  participants_count?: number;
  my_entries_count?: number;
  top_entries?: ChallengeEntry[];
  rewards?: ChallengeReward[];
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  content_url: string;
  visibility?: string;
  likes_count: number;
  created_at: string;
  is_liked?: boolean;
  user?: {
    nick: string;
    avatar_snapshot_url?: string | null;
  };
}

export interface ChallengeReward {
  id: string;
  position: number;
  reward_type: string;
  reward_id: string;
  sticker?: {
    name: string;
    emoji: string;
    rarity: string;
  };
  avatar_item?: {
    name: string;
    rarity: string;
  };
}

export interface ChallengeWinner {
  id: string;
  challenge_id: string;
  user_id: string;
  position: number;
  likes_count: number;
  user?: {
    nick: string;
    avatar_snapshot_url?: string | null;
  };
}

interface StickerRow {
  id: string;
  name: string;
  emoji: string;
  rarity: string;
}

interface ChallengeRewardRow {
  id: string;
  challenge_id: string;
  position: number;
  reward_type: string;
  reward_id: string;
}

interface ChallengeLikeRow {
  entry_id: string;
  user_id: string;
}

interface ChallengeWinnerRow {
  challenge_id: string;
  position: number;
  likes_count: number;
  user: { nick: string; avatar_snapshot_url: string | null } | null;
}

export function useChallenges() {
  const { user } = useAuth();
  const [todayChallenge, setTodayChallenge] = useState<Challenge | null>(null);
  const [pastChallenges, setPastChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate time remaining until midnight Madrid
  const calculateTimeRemaining = useCallback(() => {
    const now = new Date();
    const madridNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    const midnight = new Date(madridNow);
    midnight.setHours(24, 0, 0, 0);
    
    const diff = midnight.getTime() - madridNow.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);
    setTimeRemaining(calculateTimeRemaining());
    return () => clearInterval(interval);
  }, [calculateTimeRemaining]);

  const fetchTodayChallenge = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get today's date in Madrid timezone
      const today = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'Europe/Madrid' 
      });
      
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

      // Get top 10 entries with like status
      const { data: entries } = await supabase
        .from('challenge_entries')
        .select(`
          *,
          user:profiles!challenge_entries_user_id_fkey(nick, avatar_snapshot_url)
        `)
        .eq('challenge_id', challenge.id)
        .order('likes_count', { ascending: false })
        .limit(10);

      let topEntries = (entries || []) as unknown as ChallengeEntry[];
      
      // Check which entries user has liked
      if (user && topEntries.length > 0) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const session = await supabase.auth.getSession();
        
        const likesRes = await fetch(
          `${supabaseUrl}/rest/v1/challenge_likes?user_id=eq.${user.id}&select=entry_id`, 
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${session.data.session?.access_token}`,
            }
          }
        );
        const userLikes = await likesRes.json() as ChallengeLikeRow[];
        
        const likedEntryIds = new Set(userLikes?.map(l => l.entry_id) || []);
        
        topEntries = topEntries.map(e => ({
          ...e,
          is_liked: likedEntryIds.has(e.id)
        }));
      }

      // Get rewards for this challenge (using raw query for new table)
      const { data: rewards } = await supabase
        .from('challenge_rewards' as 'posts')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('position');

      const rewardsData = rewards as unknown as ChallengeRewardRow[] | null;

      // Fetch sticker details for rewards
      let rewardsWithDetails: ChallengeReward[] = [];
      if (rewardsData && rewardsData.length > 0) {
        const stickerIds = rewardsData.filter(r => r.reward_type === 'sticker').map(r => r.reward_id);
        
        const { data: stickers } = await supabase
          .from('stickers' as 'posts')
          .select('id, name, emoji, rarity')
          .in('id', stickerIds);
        
        const stickersData = stickers as unknown as StickerRow[] | null;
        const stickerMap = new Map(stickersData?.map(s => [s.id, s]) || []);
        
        rewardsWithDetails = rewardsData.map(r => ({
          id: r.id,
          position: r.position,
          reward_type: r.reward_type,
          reward_id: r.reward_id,
          sticker: r.reward_type === 'sticker' ? stickerMap.get(r.reward_id) : undefined
        }));
      }

      setTodayChallenge({
        id: challenge.id,
        title: (challenge as Record<string, unknown>).title as string || null,
        description: challenge.description,
        challenge_date: challenge.challenge_date,
        is_active: challenge.is_active,
        created_at: challenge.created_at,
        generated_by: (challenge as Record<string, unknown>).generated_by as string || null,
        rewards_assigned: (challenge as Record<string, unknown>).rewards_assigned as boolean || null,
        participants_count: participantsCount || 0,
        my_entries_count: myEntriesCount,
        top_entries: topEntries,
        rewards: rewardsWithDetails
      });
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar el desafío');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPastChallenges = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'Europe/Madrid' 
      });
      
      const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .lt('challenge_date', today)
        .order('challenge_date', { ascending: false })
        .limit(10);

      if (challenges) {
        // Get winners for each challenge
        const challengeIds = challenges.map(c => c.id);
        const { data: winners } = await supabase
          .from('challenge_winners' as 'posts')
          .select(`
            challenge_id,
            position,
            likes_count,
            user:profiles!challenge_winners_user_id_fkey(nick, avatar_snapshot_url)
          `)
          .in('challenge_id', challengeIds)
          .order('position');

        const winnersData = winners as unknown as ChallengeWinnerRow[] | null;

        setPastChallenges(challenges.map(c => ({
          id: c.id,
          title: (c as Record<string, unknown>).title as string || null,
          description: c.description,
          challenge_date: c.challenge_date,
          is_active: c.is_active,
          created_at: c.created_at,
          generated_by: (c as Record<string, unknown>).generated_by as string || null,
          rewards_assigned: (c as Record<string, unknown>).rewards_assigned as boolean || null,
          top_entries: winnersData?.filter(w => w.challenge_id === c.id).map(w => ({
            id: w.challenge_id,
            challenge_id: w.challenge_id,
            user_id: '',
            content_url: '',
            visibility: 'public',
            likes_count: w.likes_count,
            created_at: '',
            user: w.user ? { nick: w.user.nick, avatar_snapshot_url: w.user.avatar_snapshot_url } : undefined
          })) || []
        })));
      }
    } catch (err) {
      console.error('Error fetching past challenges:', err);
    }
  }, []);

  const submitEntry = async (contentUrl: string, visibility: 'public' | 'friends' = 'public') => {
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

      toast.success('¡Participación enviada!');
      await fetchTodayChallenge();
      return { data, error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const toggleLikeEntry = async (entryId: string) => {
    if (!user) {
      toast.error('Inicia sesión para dar like');
      return;
    }

    const entry = todayChallenge?.top_entries?.find(e => e.id === entryId);
    if (!entry) return;

    // Prevent self-liking
    if (entry.user_id === user.id) {
      toast.error('No puedes dar like a tu propia participación');
      return;
    }

    try {
      // Use direct fetch for new tables not yet in generated types
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (entry.is_liked) {
        // Unlike
        await fetch(`${supabaseUrl}/rest/v1/challenge_likes?entry_id=eq.${entryId}&user_id=eq.${user.id}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          }
        });
      } else {
        // Like
        await fetch(`${supabaseUrl}/rest/v1/challenge_likes`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ entry_id: entryId, user_id: user.id })
        });
      }

      await fetchTodayChallenge();
    } catch (err) {
      console.error('Error toggling like:', err);
      toast.error('Error al procesar');
    }
  };

  const generateTodayChallenge = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-challenge');
      
      if (error) {
        toast.error('Error generando desafío');
        return { error };
      }
      
      toast.success('¡Desafío generado!');
      await fetchTodayChallenge();
      return { data };
    } catch (err) {
      return { error: err };
    }
  };

  // Legacy compatibility
  const likeEntry = async (entryId: string) => {
    await toggleLikeEntry(entryId);
  };

  useEffect(() => {
    fetchTodayChallenge();
    fetchPastChallenges();

    // Subscribe to entries updates
    const channel = supabase
      .channel('challenge-realtime')
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
  }, [user, fetchTodayChallenge, fetchPastChallenges]);

  return {
    todayChallenge,
    pastChallenges,
    isLoading,
    error,
    timeRemaining,
    submitEntry,
    toggleLikeEntry,
    likeEntry,
    generateTodayChallenge,
    refreshChallenge: fetchTodayChallenge
  };
}
