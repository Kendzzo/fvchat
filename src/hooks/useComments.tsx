import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  text: string;
  created_at: string;
  author?: {
    nick: string;
    avatar_data: Record<string, unknown>;
    avatar_snapshot_url?: string | null;
  };
}

export function useComments(postId: string | null) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canComment = profile?.parent_approved === true;

  const fetchComments = async () => {
    if (!postId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles!comments_author_id_fkey(nick, avatar_data, avatar_snapshot_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      setComments(data as Comment[]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async (text: string) => {
    if (!user || !postId || !canComment) {
      return { error: new Error('No autorizado para comentar') };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          text: text.trim()
        })
        .select(`
          *,
          author:profiles!comments_author_id_fkey(nick, avatar_data, avatar_snapshot_url)
        `)
        .single();

      if (insertError) {
        return { error: new Error(insertError.message) };
      }

      setComments(prev => [...prev, data as Comment]);
      return { data, error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return { error: new Error('No autenticado') };

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      setComments(prev => prev.filter(c => c.id !== commentId));
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  useEffect(() => {
    fetchComments();

    if (postId) {
      const channel = supabase
        .channel(`comments-${postId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${postId}`
          },
          async (payload) => {
            const { data: newComment } = await supabase
              .from('comments')
              .select(`
                *,
                author:profiles!comments_author_id_fkey(nick, avatar_data, avatar_snapshot_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (newComment) {
              setComments(prev => {
                if (prev.find(c => c.id === newComment.id)) return prev;
                return [...prev, newComment as Comment];
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [postId]);

  return {
    comments,
    isLoading,
    canComment,
    addComment,
    deleteComment,
    refreshComments: fetchComments
  };
}
