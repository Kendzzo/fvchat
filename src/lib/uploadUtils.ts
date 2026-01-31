/**
 * Ultra-stable upload utilities with retry, timeout, and proper error handling
 * for chat media (images and audio)
 */

const MAX_UPLOAD_TIME = 25000; // 25 seconds total max
const RETRY_DELAYS = [600, 1400]; // Backoff delays in ms

/**
 * Checks if an error is transient and should be retried
 */
export function isTransientError(err: unknown): boolean {
  const anyErr = err as any;
  const name = anyErr?.name || anyErr?.value?.name || "";
  const message = anyErr?.message || anyErr?.value?.message || "";
  const status = anyErr?.status || anyErr?.statusCode || 0;
  const originalName = anyErr?.originalError?.name || "";
  const originalMessage = anyErr?.originalError?.message || "";
  
  const fullText = `${name} ${message} ${originalName} ${originalMessage}`.toLowerCase();
  
  // Transient errors that should be retried
  if (name === "StorageUnknownError") return true;
  if (originalName === "AbortError") return true;
  if (fullText.includes("aborted")) return true;
  if (fullText.includes("canceled")) return true;
  if (fullText.includes("network")) return true;
  if (fullText.includes("failed to fetch")) return true;
  if (status === 0) return true;
  if (status >= 500 && status < 600) return true;
  
  return false;
}

/**
 * Checks if an error is a permission error (should NOT retry)
 */
export function isPermissionError(err: unknown): boolean {
  const anyErr = err as any;
  const message = anyErr?.message || anyErr?.value?.message || "";
  const status = anyErr?.status || anyErr?.statusCode || 0;
  
  if (status === 401 || status === 403) return true;
  if (message.includes("policy") || message.includes("403") || message.includes("401")) return true;
  if (message.includes("permission") || message.includes("unauthorized")) return true;
  
  return false;
}

/**
 * Formats an error for user-friendly display
 */
export function formatUploadError(err: unknown, kind: "image" | "audio"): string {
  if (isPermissionError(err)) {
    return "Permiso denegado (Storage). Revisar políticas del bucket.";
  }
  
  const anyErr = err as any;
  const message = anyErr?.message || "";
  
  if (message.toLowerCase().includes("aborted") || message.toLowerCase().includes("canceled")) {
    return `No se pudo subir el ${kind === "image" ? "archivo" : "audio"}. La conexión se interrumpió.`;
  }
  
  if (message.toLowerCase().includes("timeout")) {
    return "La conexión tardó demasiado.";
  }
  
  return `No se pudo subir el ${kind === "image" ? "archivo" : "audio"}. Reintenta.`;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a promise with timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error(`[CHAT][TIMEOUT] ${label} timed out after ${ms}ms`);
      reject(new Error(`Timeout: ${label}`));
    }, ms);
    
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

/**
 * Executes an upload with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)];
        console.log(`[CHAT][RETRY] ${label} attempt ${attempt + 1}/${maxAttempts} after ${delay}ms`);
        await sleep(delay);
      }
      
      return await fn();
    } catch (err) {
      lastError = err;
      console.error(`[CHAT][RETRY_FAIL] ${label} attempt ${attempt + 1} failed:`, err);
      
      // Don't retry permission errors
      if (isPermissionError(err)) {
        throw err;
      }
      
      // Only retry transient errors
      if (!isTransientError(err)) {
        throw err;
      }
    }
  }
  
  throw lastError;
}

/**
 * Comprehensive upload wrapper with timeout and retry
 */
export async function robustUpload<T>(
  uploadFn: () => Promise<T>,
  label: string
): Promise<T> {
  const startTime = Date.now();
  
  return withRetry(
    () => withTimeout(uploadFn(), MAX_UPLOAD_TIME, label),
    label,
    3
  );
}

/**
 * Compress image if too large (client-side)
 * Returns compressed blob or original file if compression fails
 */
export async function compressImageIfNeeded(
  file: File,
  maxSizeMB: number = 6,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<{ blob: Blob; compressed: boolean }> {
  // If already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return { blob: file, compressed: false };
  }
  
  console.log(`[CHAT][COMPRESS] Image too large (${(file.size / 1024 / 1024).toFixed(2)}MB), compressing...`);
  
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    img.onload = () => {
      try {
        let { width, height } = img;
        
        // Scale down if needed
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (!ctx) {
          console.error("[CHAT][COMPRESS] Canvas context not available");
          resolve({ blob: file, compressed: false });
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              console.log(`[CHAT][COMPRESS] Compressed to ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
              resolve({ blob, compressed: true });
            } else {
              console.log("[CHAT][COMPRESS] Compression didn't reduce size, using original");
              resolve({ blob: file, compressed: false });
            }
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        console.error("[CHAT][COMPRESS] Error during compression:", err);
        resolve({ blob: file, compressed: false });
      }
      
      // Cleanup
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      console.error("[CHAT][COMPRESS] Failed to load image for compression");
      URL.revokeObjectURL(img.src);
      resolve({ blob: file, compressed: false });
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get best supported audio MIME type
 */
export function getBestAudioMimeType(): string | null {
  const mimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];
  
  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  
  return null;
}

/**
 * Get file extension for audio MIME type
 */
export function getAudioExtension(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm"; // fallback
}
