import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PendingUser {
  id: string;
  nick: string;
  birth_year: number;
  age_group: string;
  tutor_email: string;
  parent_approved: boolean;
  account_status: string;
  created_at: string;
}

export function useAdminUsers() {
  const { isAdmin } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nick, birth_year, age_group, tutor_email, parent_approved, account_status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const users = data as PendingUser[];
      setAllUsers(users);
      setPendingUsers(users.filter(u => !u.parent_approved));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    if (!isAdmin) return { error: new Error('No autorizado') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          parent_approved: true,
          account_status: 'active'
        })
        .eq('id', userId);

      if (error) {
        return { error: new Error(error.message) };
      }

      await fetchUsers();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const revokeApproval = async (userId: string) => {
    if (!isAdmin) return { error: new Error('No autorizado') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          parent_approved: false,
          account_status: 'pending_approval'
        })
        .eq('id', userId);

      if (error) {
        return { error: new Error(error.message) };
      }

      await fetchUsers();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  return {
    pendingUsers,
    allUsers,
    isLoading,
    approveUser,
    revokeApproval,
    refreshUsers: fetchUsers
  };
}
