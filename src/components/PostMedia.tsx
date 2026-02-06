import { useState, useEffect } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { getSignedUrl, needsSignedUrl } from '@/lib/signedUrls';

interface PostMediaProps {
  type: 'photo' | 'video' | 'text' | 'audio' | 'image';
  contentUrl: string | null;
  postId: string;
  children?: React.ReactNode; // For sticker overlay
}

export function PostMedia({ type, contentUrl, children }: PostMediaProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUrl = async () => {
      if (!contentUrl) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        // Check if URL needs signed access (private bucket)
        if (needsSignedUrl(contentUrl)) {
          const signed = await getSignedUrl(contentUrl);
          if (!cancelled) {
            setDisplayUrl(signed);
          }
        } else {
          // Public URL, use as-is
          if (!cancelled) {
            setDisplayUrl(contentUrl);
          }
        }
      } catch (err) {
        console.error('[PostMedia] Error getting signed URL:', err);
        if (!cancelled) {
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadUrl();

    return () => {
      cancelled = true;
    };
  }, [contentUrl]);

  // No content URL - don't render anything
  if (!contentUrl) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full aspect-square bg-muted/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Media failed to load - show fallback
  if (hasError || !displayUrl) {
    return (
      <div className="w-full aspect-square bg-muted/50 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <ImageOff className="w-12 h-12" />
        <span className="text-sm">Contenido no disponible</span>
      </div>
    );
  }

  // Render image
  if (type === 'photo' || type === 'image') {
    return (
      <div className="relative">
        <img
          src={displayUrl}
          alt="Publicación"
          className="w-full aspect-square object-cover"
          onError={() => setHasError(true)}
        />
        {children}
      </div>
    );
  }

  // Render video
  if (type === 'video') {
    return (
      <video
        src={displayUrl}
        controls
        playsInline
        className="w-full aspect-video bg-black"
        onError={() => setHasError(true)}
      />
    );
  }

  return null;
}
