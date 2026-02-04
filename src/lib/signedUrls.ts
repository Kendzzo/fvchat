/**
 * Utility to generate signed URLs for private storage content
 * Used for audio/image/video in chat and posts
 */
import { supabase } from "@/integrations/supabase/client";

// In-memory cache for signed URLs (TTL ~50 min to be safe with 1h expiry)
const signedUrlCache: Map<string, { url: string; expires: number }> = new Map();
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes

/**
 * Extracts bucket and path from a Supabase storage URL
 * Example: https://xxx.supabase.co/storage/v1/object/public/content/userId/chat/images/file.png
 * Returns: { bucket: "content", path: "userId/chat/images/file.png" }
 */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    // Match pattern: /storage/v1/object/public/{bucket}/{path}
    const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (publicMatch) {
      return { bucket: publicMatch[1], path: publicMatch[2] };
    }
    
    // Match pattern: /storage/v1/object/{bucket}/{path} (without public)
    const privateMatch = url.match(/\/storage\/v1\/object\/([^/]+)\/(.+)/);
    if (privateMatch) {
      return { bucket: privateMatch[1], path: privateMatch[2] };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if URL needs a signed URL (is from private bucket)
 */
export function needsSignedUrl(url: string | null): boolean {
  if (!url) return false;
  // URLs from private buckets need signing
  // The 'content' bucket is private
  return url.includes("/storage/v1/object/") && 
         (url.includes("/content/") || !url.includes("/public/"));
}

/**
 * Get a signed URL for a storage path.
 * Uses cache to avoid repeated requests.
 */
export async function getSignedUrl(url: string): Promise<string> {
  if (!url) return url;
  
  // Check if it's a storage URL that needs signing
  if (!needsSignedUrl(url)) {
    return url; // Public bucket or external URL, return as-is
  }
  
  // Check cache first
  const cached = signedUrlCache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }
  
  // Parse the URL to get bucket and path
  const parsed = parseStorageUrl(url);
  if (!parsed) {
    console.warn("[signedUrls] Could not parse storage URL:", url);
    return url;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600); // 1 hour expiry
    
    if (error) {
      console.error("[signedUrls] Error creating signed URL:", error);
      return url; // Fallback to original URL
    }
    
    const signedUrl = data.signedUrl;
    
    // Cache the result
    signedUrlCache.set(url, {
      url: signedUrl,
      expires: Date.now() + CACHE_TTL_MS,
    });
    
    return signedUrl;
  } catch (err) {
    console.error("[signedUrls] Exception:", err);
    return url;
  }
}

/**
 * Batch get signed URLs for multiple content URLs
 */
export async function getSignedUrls(urls: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  await Promise.all(
    urls.map(async (url) => {
      const signedUrl = await getSignedUrl(url);
      result.set(url, signedUrl);
    })
  );
  
  return result;
}
