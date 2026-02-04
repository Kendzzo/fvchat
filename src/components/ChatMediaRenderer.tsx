/**
 * ChatMediaRenderer - Renders audio/image/video with signed URLs
 * Minimal component to handle private bucket content
 */
import { useState, useEffect } from "react";
import { getSignedUrl, needsSignedUrl } from "@/lib/signedUrls";

interface ChatMediaRendererProps {
  url: string;
  type: "audio" | "image" | "video";
  className?: string;
}

export function ChatMediaRenderer({ url, type, className }: ChatMediaRendererProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadUrl = async () => {
      setLoading(true);
      setError(false);

      try {
        // If URL needs signing, get signed URL
        if (needsSignedUrl(url)) {
          const signed = await getSignedUrl(url);
          if (!cancelled) {
            setSignedUrl(signed);
          }
        } else {
          // Public URL or external, use as-is
          if (!cancelled) {
            setSignedUrl(url);
          }
        }
      } catch (err) {
        console.error("[ChatMediaRenderer] Error getting signed URL:", err);
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUrl();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 rounded-lg ${type === "audio" ? "h-12 w-48" : "w-48 h-32"}`}>
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-destructive/10 text-destructive text-xs rounded-lg ${type === "audio" ? "h-12 w-48 px-3" : "w-48 h-32"}`}>
        Error al cargar
      </div>
    );
  }

  if (type === "audio") {
    return (
      <audio 
        src={signedUrl} 
        controls 
        className={className || "max-w-[240px]"}
        onError={() => setError(true)}
      />
    );
  }

  if (type === "video") {
    return (
      <video 
        src={signedUrl} 
        controls 
        playsInline
        className={className || "max-w-[200px] rounded-lg"}
        onError={() => setError(true)}
      />
    );
  }

  // Default: image
  return (
    <img 
      src={signedUrl} 
      alt="Media" 
      className={className || "max-w-[200px] rounded-lg"}
      onError={() => setError(true)}
    />
  );
}
