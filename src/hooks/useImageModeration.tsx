import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ImageModerationResult {
  allowed: boolean;
  categories: string[];
  severity: 'low' | 'medium' | 'high' | null;
  reason: string;
  fallback?: boolean;
}

type Surface = 'post' | 'chat' | 'profile' | 'sticker' | 'challenge';

/**
 * Hook for moderating images server-side before upload/publish
 * Uses the moderate-image edge function which leverages Gemini Vision
 */
export function useImageModeration() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<ImageModerationResult | null>(null);

  /**
   * Moderate an image by URL
   */
  const moderateImageByUrl = useCallback(async (
    imageUrl: string,
    surface: Surface = 'post'
  ): Promise<ImageModerationResult> => {
    setIsChecking(true);
    setLastResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({
            imageUrl,
            surface,
            checkText: true,
          }),
        }
      );

      if (!response.ok) {
        console.error('[useImageModeration] Request failed:', response.status);
        // Fail open for UX
        return { allowed: true, categories: [], severity: null, reason: '', fallback: true };
      }

      const result: ImageModerationResult = await response.json();
      setLastResult(result);
      return result;
    } catch (error) {
      console.error('[useImageModeration] Error:', error);
      // Fail open for UX
      return { allowed: true, categories: [], severity: null, reason: '', fallback: true };
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Moderate an image from a File object (converts to base64)
   */
  const moderateImageFile = useCallback(async (
    file: File,
    surface: Surface = 'post'
  ): Promise<ImageModerationResult> => {
    setIsChecking(true);
    setLastResult(null);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({
            imageBase64: base64,
            surface,
            checkText: true,
          }),
        }
      );

      if (!response.ok) {
        console.error('[useImageModeration] Request failed:', response.status);
        return { allowed: true, categories: [], severity: null, reason: '', fallback: true };
      }

      const result: ImageModerationResult = await response.json();
      setLastResult(result);
      return result;
    } catch (error) {
      console.error('[useImageModeration] Error:', error);
      return { allowed: true, categories: [], severity: null, reason: '', fallback: true };
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    moderateImageByUrl,
    moderateImageFile,
    isChecking,
    lastResult,
  };
}

/**
 * Convert File to base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
