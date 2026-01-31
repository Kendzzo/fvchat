import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ModerationResult {
  allowed: boolean;
  suspended: boolean;
  suspended_until?: string;
  reason?: string;
  categories?: string[];
  severity?: 'low' | 'medium' | 'high';
  strikes?: number;
}

export function useModeration() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [suspensionInfo, setSuspensionInfo] = useState<{
    suspended: boolean;
    until?: Date;
  }>({ suspended: false });

  const checkContent = useCallback(async (
    text: string,
    surface: 'chat' | 'post' | 'comment'
  ): Promise<ModerationResult> => {
    if (!user) {
      return { allowed: false, suspended: false, reason: 'No autenticado' };
    }

    if (!text.trim()) {
      return { allowed: true, suspended: false };
    }

    setIsChecking(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        return { allowed: false, suspended: false, reason: 'Sesión expirada' };
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-content`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ text, surface }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error('Moderation request failed:', response.status);
          // Fail open for availability
          return { allowed: true, suspended: false };
        }

        const result: ModerationResult = await response.json();

        // Update suspension state
        if (result.suspended && result.suspended_until) {
          setSuspensionInfo({
            suspended: true,
            until: new Date(result.suspended_until),
          });
        }

        return result;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Moderation fetch error (timeout or network):', fetchError);
        // Fail open for availability
        return { allowed: true, suspended: false };
      }
    } catch (error) {
      console.error('Moderation error:', error);
      // Fail open for availability
      return { allowed: true, suspended: false };
    } finally {
      setIsChecking(false);
    }
  }, [user]);

  const checkSuspension = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('suspended_until')
        .eq('id', user.id)
        .single();

      if (profile?.suspended_until) {
        const suspendedUntil = new Date(profile.suspended_until);
        if (suspendedUntil > new Date()) {
          setSuspensionInfo({ suspended: true, until: suspendedUntil });
          return true;
        }
      }

      setSuspensionInfo({ suspended: false });
      return false;
    } catch (error) {
      console.error('Error checking suspension:', error);
      return false;
    }
  }, [user]);

  const formatSuspensionTime = useCallback((): string => {
    if (!suspensionInfo.until) return '';
    
    const until = suspensionInfo.until;
    const now = new Date();
    const diffMs = until.getTime() - now.getTime();
    
    if (diffMs <= 0) return '';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} minutos`;
  }, [suspensionInfo.until]);

  return {
    checkContent,
    checkSuspension,
    isChecking,
    suspensionInfo,
    formatSuspensionTime,
  };
}
