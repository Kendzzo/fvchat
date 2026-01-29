import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function usePostActions() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const deletePost = async (postId: string) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', user.id);

      if (error) throw error;

      toast.success('Publicación eliminada');
      window.dispatchEvent(new Event('vfc-posts-refresh'));
      return { error: null };
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error al eliminar publicación');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const updatePostText = async (postId: string, newText: string) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ text: newText })
        .eq('id', postId)
        .eq('author_id', user.id);

      if (error) throw error;

      toast.success('Publicación actualizada');
      window.dispatchEvent(new Event('vfc-posts-refresh'));
      return { error: null };
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Error al actualizar publicación');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const muteUser = async (mutedUserId: string) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      // Store muted users in localStorage for now (could be a DB table later)
      const mutedUsers = JSON.parse(localStorage.getItem('vfc-muted-users') || '[]');
      if (!mutedUsers.includes(mutedUserId)) {
        mutedUsers.push(mutedUserId);
        localStorage.setItem('vfc-muted-users', JSON.stringify(mutedUsers));
      }

      toast.success('Usuario silenciado. No verás sus publicaciones.');
      window.dispatchEvent(new Event('vfc-posts-refresh'));
      return { error: null };
    } catch (error) {
      console.error('Error muting user:', error);
      toast.error('Error al silenciar usuario');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const unmuteUser = async (mutedUserId: string) => {
    if (!user) return { error: new Error('No autenticado') };

    try {
      const mutedUsers = JSON.parse(localStorage.getItem('vfc-muted-users') || '[]');
      const filtered = mutedUsers.filter((id: string) => id !== mutedUserId);
      localStorage.setItem('vfc-muted-users', JSON.stringify(filtered));

      toast.success('Usuario desilenciado');
      return { error: null };
    } catch (error) {
      console.error('Error unmuting user:', error);
      return { error: error as Error };
    }
  };

  const isUserMuted = (userId: string): boolean => {
    try {
      const mutedUsers = JSON.parse(localStorage.getItem('vfc-muted-users') || '[]');
      return mutedUsers.includes(userId);
    } catch {
      return false;
    }
  };

  const blockUser = async (blockedUserId: string) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Usuario ya bloqueado');
          return { error: null };
        }
        throw error;
      }

      toast.success('Usuario bloqueado');
      window.dispatchEvent(new Event('vfc-posts-refresh'));
      return { error: null };
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Error al bloquear usuario');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const reportPost = async (postId: string, authorId: string, reason: string) => {
    if (!user) return { error: new Error('No autenticado') };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: authorId,
          reason: `[Post: ${postId}] ${reason}`
        });

      if (error) throw error;

      toast.success('Reporte enviado. Gracias por ayudarnos.');
      return { error: null };
    } catch (error) {
      console.error('Error reporting post:', error);
      toast.error('Error al enviar reporte');
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    deletePost,
    updatePostText,
    muteUser,
    unmuteUser,
    isUserMuted,
    blockUser,
    reportPost,
    isLoading
  };
}
