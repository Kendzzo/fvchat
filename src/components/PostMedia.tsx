import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface PostMediaProps {
  type: 'photo' | 'video' | 'text' | 'audio' | 'image';
  contentUrl: string | null;
  postId: string;
  children?: React.ReactNode; // For sticker overlay
}

export function PostMedia({ type, contentUrl, children }: PostMediaProps) {
  const [hasError, setHasError] = useState(false);

  // No content URL - don't render anything
  if (!contentUrl) {
    return null;
  }

  // Media failed to load - show fallback
  if (hasError) {
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
          src={contentUrl}
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
        src={contentUrl}
        controls
        className="w-full aspect-video bg-black"
        onError={() => setHasError(true)}
      />
    );
  }

  return null;
}
