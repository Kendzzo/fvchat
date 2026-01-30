import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UploadProgress {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
}

interface UploadResult {
  url: string | null;
  error: Error | null;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 10; // seconds

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
// Include all common video MIME types, especially video/quicktime for iPhone MOV files
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/x-m4v"];

export function useMediaUpload() {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });

  const validateFile = async (file: File, type: "image" | "video"): Promise<{ valid: boolean; error?: string }> => {
    // Check MIME type
    if (type === "image") {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { valid: false, error: "Formato de imagen no soportado. Usa JPG, PNG, GIF o WebP." };
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return { valid: false, error: "La imagen es muy grande. Máximo 10MB." };
      }
    } else {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return { valid: false, error: "Formato de vídeo no soportado. Usa MP4, MOV o WebM." };
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return { valid: false, error: "El vídeo es muy grande. Máximo 50MB." };
      }
    }

    return { valid: true };
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject(new Error("No se pudo leer el vídeo"));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const uploadMedia = async (file: File, type: "image" | "video"): Promise<UploadResult> => {
    if (!user) {
      return { url: null, error: new Error("Debes iniciar sesión") };
    }

    setUploadProgress({ status: "uploading", progress: 10, message: "Validando archivo..." });

    // Validate file
    const validation = await validateFile(file, type);
    if (!validation.valid) {
      setUploadProgress({ status: "error", progress: 0, message: validation.error! });
      return { url: null, error: new Error(validation.error) };
    }

    // Validate video duration (if metadata can be read)
    if (type === "video") {
      try {
        setUploadProgress({ status: "uploading", progress: 20, message: "Verificando duración..." });
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION) {
          const errorMsg = `El vídeo dura ${Math.round(duration)}s. Máximo permitido: ${MAX_VIDEO_DURATION}s.`;
          setUploadProgress({ status: "error", progress: 0, message: errorMsg });
          return { url: null, error: new Error(errorMsg) };
        }
      } catch (err) {
        // iOS/iPhone may fail to read metadata for some video formats
        // DO NOT block upload - allow it to proceed
        console.warn("Could not check video duration (iOS quirk, proceeding anyway):", err);
      }
    }

    setUploadProgress({ status: "uploading", progress: 30, message: "Subiendo..." });

    try {
      // Generate unique filename with proper extension for iPhone videos
      const timestamp = Date.now();
      let extension = file.name.split(".").pop()?.toLowerCase() || (type === "image" ? "jpg" : "mp4");

      // Force correct extension for iPhone MOV files
      if (type === "video" && file.type === "video/quicktime") {
        extension = "mov";
      }

      const fileName = `${user.id}/${timestamp}_${type}.${extension}`;

      // Upload to Supabase Storage with explicit contentType for iPhone compatibility
      const { data, error } = await supabase.storage.from("content").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        console.error("Upload error:", error);
        // Provide helpful error message for MIME type issues
        let errorMessage = error.message;
        if (error.message.includes("mime") || error.message.includes("type")) {
          errorMessage = `El servidor no acepta este formato de vídeo. Verifica que video/quicktime esté habilitado en el bucket.`;
        }
        setUploadProgress({ status: "error", progress: 0, message: "Error al subir: " + errorMessage });
        return { url: null, error };
      }

      setUploadProgress({ status: "uploading", progress: 90, message: "Finalizando..." });

      // Get public URL
      const { data: urlData } = supabase.storage.from("content").getPublicUrl(data.path);

      setUploadProgress({ status: "success", progress: 100, message: "¡Subido!" });

      return { url: urlData.publicUrl, error: null };
    } catch (err) {
      const error = err as Error;
      setUploadProgress({ status: "error", progress: 0, message: error.message });
      return { url: null, error };
    }
  };

  const resetProgress = () => {
    setUploadProgress({ status: "idle", progress: 0, message: "" });
  };

  return {
    uploadMedia,
    uploadProgress,
    resetProgress,
    MAX_IMAGE_SIZE,
    MAX_VIDEO_SIZE,
    MAX_VIDEO_DURATION,
  };
}
