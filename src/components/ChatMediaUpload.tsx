import { useRef, useState } from "react";
import { Image, Mic, Loader2, X, Square, Circle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImageModeration } from "@/hooks/useImageModeration";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  robustUpload,
  formatUploadError,
  isPermissionError,
  compressImageIfNeeded,
  getBestAudioMimeType,
  getAudioExtension,
} from "@/lib/uploadUtils";

interface ChatMediaUploadProps {
  onMediaReady: (url: string, type: "image" | "audio") => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * ChatMediaUpload - Ultra-stable media upload for chat
 * Features:
 * - Retry logic for transient errors (aborted, network issues)
 * - Timeout handling
 * - Image compression for large files
 * - Cross-browser audio recording
 * - Prevents modal close during upload
 */
export function ChatMediaUpload({ onMediaReady, disabled }: ChatMediaUploadProps) {
  const { user } = useAuth();
  const { moderateImageFile, isChecking: isModeratingImage } = useImageModeration();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAudioModal, setShowAudioModal] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ✅ Safe MIME picker (Lovable + macOS/Safari friendly)
  const getSafeAudioMime = () => {
    if (typeof MediaRecorder === "undefined") return null;

    const candidates = ["audio/webm;codecs=opus", "audio/webm"];

    for (const mime of candidates) {
      try {
        if ((MediaRecorder as any)?.isTypeSupported?.(mime)) return mime;
      } catch {
        // ignore
      }
    }
    return null;
  };

  const handleImageClick = () => {
    if (disabled || isUploading || isModeratingImage) return;
    setUploadError(null);
    imageInputRef.current?.click();
  };

  const handleAudioClick = () => {
    console.log("[CHAT][AUDIO_CLICK] Button clicked, disabled:", disabled, "isUploading:", isUploading);
    if (disabled || isUploading) {
      console.log("[CHAT][AUDIO_CLICK] Blocked - returning early");
      return;
    }

    // Check if audio recording is supported
    const mimeType = getSafeAudioMime() || getBestAudioMimeType();
    if (!mimeType) {
      console.error("[CHAT][AUDIO_CLICK] No supported audio MIME type");
      toast.error("Tu navegador no soporta grabación de audio");
      return;
    }

    setAudioMimeType(mimeType);
    setAudioUploadError(null);
    console.log("[CHAT][AUDIO_CLICK] Opening audio modal with MIME:", mimeType);
    setShowAudioModal(true);
  };

  const uploadImage = async (file: File) => {
    if (!user) {
      toast.error("No autenticado");
      return;
    }

    console.log("[CHAT][UPLOAD_START]", {
      kind: "image",
      size: file.size,
      mime: file.type,
      name: file.name,
    });

    if (file.size > MAX_IMAGE_SIZE) {
      console.log("[CHAT][UPLOAD_FAIL] Image too large:", file.size);
      toast.error("La imagen debe ser menor a 10MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Compress if needed (>6MB)
      const { blob: processedBlob, compressed } = await compressImageIfNeeded(file);

      // MODERATION: Check image before uploading (with timeout, non-blocking if fails)
      console.log("[CHAT][MODERATION_START_ASYNC] Checking image...");
      try {
        const modResult = await moderateImageFile(file, "chat");
        if (!modResult.allowed) {
          console.log("[CHAT][MODERATION_RESULT]", { allowed: false, reason: modResult.reason });
          toast.error(modResult.reason || "Imagen no permitida");
          setIsUploading(false);
          return;
        }
        console.log("[CHAT][MODERATION_RESULT]", { allowed: true });
      } catch (modErr) {
        console.error("[CHAT][MODERATION_FAIL] Non-blocking:", modErr);
        // Fail open - continue with upload
      }

      const fileExt = compressed ? "jpg" : file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/chat/images/${Date.now()}.${fileExt}`;

      console.log("[CHAT][DB_INSERT_START]", { type: "image", path: fileName });

      // Use robust upload with retry
      await robustUpload(async () => {
        const { error: uploadError } = await supabase.storage.from("content").upload(fileName, processedBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: compressed ? "image/jpeg" : file.type || "image/jpeg",
        });

        if (uploadError) {
          throw uploadError;
        }

        return true;
      }, "image-upload");

      const { data: urlData } = supabase.storage.from("content").getPublicUrl(fileName);
      console.log("[CHAT][UPLOAD_OK]", { publicUrl: urlData.publicUrl.slice(0, 60) + "..." });

      onMediaReady(urlData.publicUrl, "image");
      toast.success("Imagen lista para enviar");
      setUploadError(null);
    } catch (error) {
      console.error("[CHAT][UPLOAD_FAIL]", {
        status: (error as any)?.status,
        name: (error as any)?.name,
        message: (error as any)?.message,
      });

      const errorMsg = formatUploadError(error, "image");
      setUploadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Audio recording functions
  const startRecording = async () => {
    const safeMime = getSafeAudioMime();
    const mimeType = safeMime || audioMimeType || getBestAudioMimeType();

    if (!mimeType) {
      toast.error("Tu navegador no soporta grabación de audio");
      return;
    }

    try {
      console.log("[CHAT][AUDIO_RECORD_START] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      console.log("[CHAT][AUDIO_RECORD] Using MIME:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      setAudioMimeType(mimeType);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });

        console.log("[CHAT][AUDIO_RECORD_STOP]", { size: blob.size, type: blob.type });

        if (blob.size === 0) {
          console.error("[CHAT][AUDIO_RECORD_STOP] ❌ Blob vacío, grabación fallida");
          toast.error("No se pudo grabar el audio. Intenta de nuevo.");
          return;
        }

        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        console.log("[CHAT][AUDIO_RECORD_STOP] ✅ Audio URL created");
      };

      // 🔥 Esto evita muchos blobs de 0 bytes: forzar chunks cada 250ms
      mediaRecorder.start(250);

      setIsRecording(true);
      setAudioUploadError(null);
      console.log("[CHAT][AUDIO_RECORD] Recording started");
    } catch (error) {
      console.error("[CHAT][AUDIO_RECORD_FAIL] Microphone access error:", error);
      toast.error("No se pudo acceder al micrófono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      console.log("[CHAT][AUDIO_RECORD] Recording stopped by user");
    }
  };

  const resetAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioUploadError(null);
    chunksRef.current = [];
  };

  const uploadAudio = async () => {
    if (!user || !audioBlob || !audioMimeType) {
      toast.error("No hay audio para enviar");
      return;
    }

    if (audioBlob.size > MAX_AUDIO_SIZE) {
      toast.error("El audio debe ser menor a 10MB");
      return;
    }

    // ✅ Upload exactly as recorded (Supabase Lovable rejects fake conversions)
    const uploadMime = audioMimeType;
    const fileName = `${user.id}/chat/audio/${Date.now()}.webm`;

    console.log("[CHAT][UPLOAD_START]", {
      kind: "audio",
      size: audioBlob.size,
      mime: uploadMime,
      path: fileName,
    });

    setIsUploadingAudio(true);
    setAudioUploadError(null);

    try {
      console.log("[CHAT][DB_INSERT_START]", { type: "audio", path: fileName });

      // Use robust upload with retry
      await robustUpload(async () => {
        const { error: uploadError } = await supabase.storage.from("content").upload(fileName, audioBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: uploadMime,
        });

        if (uploadError) {
          throw uploadError;
        }

        return true;
      }, "audio-upload");

      const { data: urlData } = supabase.storage.from("content").getPublicUrl(fileName);
      console.log("[CHAT][UPLOAD_OK]", { publicUrl: urlData.publicUrl.slice(0, 60) + "..." });

      onMediaReady(urlData.publicUrl, "audio");
      toast.success("Audio listo para enviar");

      // Cleanup and close modal on success
      resetAudio();
      setShowAudioModal(false);
    } catch (error) {
      console.error("[CHAT][UPLOAD_FAIL]", {
        status: (error as any)?.status,
        name: (error as any)?.name,
        message: (error as any)?.message,
      });

      const errorMsg = formatUploadError(error, "audio");
      setAudioUploadError(errorMsg);
      toast.error(errorMsg);
      // Keep modal open and allow retry
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const closeAudioModal = () => {
    // CRITICAL: Prevent closing while uploading
    if (isUploadingAudio) {
      console.log("[CHAT][AUDIO_MODAL] Blocked close during upload");
      toast.info("Espera a que termine la subida...");
      return;
    }

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    // Cleanup
    resetAudio();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowAudioModal(false);
  };

  return (
    <>
      {/* Hidden image input - NO video input in chat */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
        className="hidden"
      />

      {/* Image button */}
      <button
        onClick={handleImageClick}
        disabled={disabled || isUploading || isModeratingImage}
        className="p-3 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {isUploading || isModeratingImage ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Image className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Audio button */}
      <button
        onClick={handleAudioClick}
        disabled={disabled || isUploading}
        className="p-3 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <Mic className="w-5 h-5 text-white" />
      </button>

      {/* Audio modal - Portal to body with AnimatePresence inside */}
      {createPortal(
        <AnimatePresence>
          {showAudioModal && (
            <>
              <motion.div
                key="audio-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={isUploadingAudio ? undefined : closeAudioModal}
                className={`fixed inset-0 bg-black/50 z-[9999] ${isUploadingAudio ? "cursor-not-allowed" : ""}`}
              />
              <motion.div
                key="audio-modal"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl p-6 z-[10000] w-11/12 max-w-sm"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Nota de voz</h3>
                  <button
                    onClick={closeAudioModal}
                    disabled={isUploadingAudio}
                    aria-label="Cerrar"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Error display */}
                {audioUploadError && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <span>{audioUploadError}</span>
                  </div>
                )}

                <div className="text-center py-6">
                  {!audioUrl ? (
                    // Recording UI
                    <>
                      <div
                        className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                          isRecording ? "bg-destructive/20 animate-pulse" : "bg-muted"
                        }`}
                      >
                        <Mic className={`w-10 h-10 ${isRecording ? "text-destructive" : "text-muted-foreground"}`} />
                      </div>

                      {isRecording ? (
                        <>
                          <p className="text-sm text-muted-foreground mb-4">Grabando...</p>
                          <button
                            onClick={stopRecording}
                            className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-medium flex items-center justify-center gap-2"
                          >
                            <Square className="w-4 h-4" />
                            Detener
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-4">Pulsa para grabar</p>
                          <button
                            onClick={startRecording}
                            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
                          >
                            <Circle className="w-4 h-4" />
                            Grabar
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    // Preview UI
                    <>
                      <audio src={audioUrl} controls className="w-full mb-4" />

                      <div className="flex gap-2">
                        <button
                          onClick={resetAudio}
                          disabled={isUploadingAudio}
                          className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-medium disabled:opacity-50"
                        >
                          Regrabar
                        </button>
                        <button
                          onClick={uploadAudio}
                          disabled={isUploadingAudio}
                          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isUploadingAudio ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : audioUploadError ? (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Reintentar
                            </>
                          ) : (
                            "Adjuntar"
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={closeAudioModal}
                  disabled={isUploadingAudio}
                  className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingAudio ? "Subiendo..." : "Cerrar"}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
