import { useRef, useState } from "react";
import { Image, Mic, Loader2, X, Square, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImageModeration } from "@/hooks/useImageModeration";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface ChatMediaUploadProps {
  onMediaReady: (url: string, type: "image" | "audio") => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

const isAbortedStorageError = (err: unknown) => {
  const anyErr = err as any;
  const name = anyErr?.name || anyErr?.value?.name;
  const message = anyErr?.message || anyErr?.value?.message;
  const originalName = anyErr?.originalError?.name || anyErr?.value?.originalError?.value?.name;
  const originalMessage = anyErr?.originalError?.message || anyErr?.value?.originalError?.value?.message;
  const text = String(message || "") + " " + String(originalMessage || "");
  return (
    name === "StorageUnknownError" ||
    originalName === "AbortError" ||
    text.toLowerCase().includes("aborted")
  );
};

/**
 * ChatMediaUpload - For images and audio in chat
 * Videos are NOT allowed in chat - they go through PublishPage only
 * Images are moderated before upload
 */
export function ChatMediaUpload({
  onMediaReady,
  disabled
}: ChatMediaUploadProps) {
  const { user } = useAuth();
  const { moderateImageFile, isChecking: isModeratingImage } = useImageModeration();
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleImageClick = () => {
    if (disabled || isUploading || isModeratingImage) return;
    imageInputRef.current?.click();
  };

  const handleAudioClick = () => {
    console.log("[CHAT][AUDIO_CLICK] Button clicked, disabled:", disabled, "isUploading:", isUploading);
    if (disabled || isUploading) {
      console.log("[CHAT][AUDIO_CLICK] Blocked - returning early");
      return;
    }
    console.log("[CHAT][AUDIO_CLICK] Opening audio modal");
    setShowAudioModal(true);
  };

  const uploadImage = async (file: File) => {
    if (!user) {
      toast.error("No autenticado");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("La imagen debe ser menor a 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // MODERATION: Check image before uploading
      console.log("[CHAT][UPLOAD_IMAGE] Moderating image before upload...");
      const modResult = await moderateImageFile(file, "chat");
      
      if (!modResult.allowed) {
        console.log("[CHAT][UPLOAD_IMAGE] Image failed moderation:", modResult.reason);
        toast.error(modResult.reason || "Imagen no permitida");
        return;
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/chat/${Date.now()}.${fileExt}`;
      
      console.log("[CHAT][UPLOAD_IMAGE] Uploading to storage:", fileName);
      const { error: uploadError } = await supabase.storage.from("content").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg"
      });
      
      if (uploadError) {
        console.error("[CHAT][UPLOAD_IMAGE] Storage error:", uploadError);
        if (isAbortedStorageError(uploadError)) {
          console.error("[CHAT][UPLOAD_MEDIA_ERROR]", uploadError);
          toast.error("No se pudo subir la imagen. Intenta de nuevo.");
          return;
        }
        if (uploadError.message?.includes("policy") || uploadError.message?.includes("403")) {
          toast.error("Permiso denegado (Storage/RLS). Revisar políticas de Supabase.");
        } else {
          toast.error("Error al subir imagen");
        }
        return;
      }
      
      const { data: urlData } = supabase.storage.from("content").getPublicUrl(fileName);
      console.log("[CHAT][UPLOAD_IMAGE] Success:", urlData.publicUrl.slice(0, 50) + "...");
      onMediaReady(urlData.publicUrl, "image");
      toast.success("Imagen adjuntada");
    } catch (error) {
      console.error("[CHAT][UPLOAD_IMAGE] Exception:", error);
      if (isAbortedStorageError(error)) {
        console.error("[CHAT][UPLOAD_MEDIA_ERROR]", error);
        toast.error("No se pudo subir la imagen. Intenta de nuevo.");
        return;
      }
      toast.error("Error al subir imagen");
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
    try {
      console.log("[CHAT][UPLOAD_AUDIO] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Try to use webm with opus codec, fallback to default
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") 
        ? "audio/webm;codecs=opus" 
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      
      console.log("[CHAT][UPLOAD_AUDIO] Using MIME type:", mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        console.log("[CHAT][UPLOAD_AUDIO] Recording stopped, blob size:", blob.size);
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log("[CHAT][UPLOAD_AUDIO] Recording started");
    } catch (error) {
      console.error("[CHAT][UPLOAD_AUDIO] Microphone access error:", error);
      toast.error("No se pudo acceder al micrófono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      console.log("[CHAT][UPLOAD_AUDIO] Recording stopped by user");
    }
  };

  const resetAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    chunksRef.current = [];
  };

  const uploadAudio = async () => {
    if (!user || !audioBlob) {
      toast.error("No hay audio para enviar");
      return;
    }

    if (audioBlob.size > MAX_AUDIO_SIZE) {
      toast.error("El audio debe ser menor a 10MB");
      return;
    }

    setIsUploadingAudio(true);

    try {
      const extension = audioBlob.type.includes("webm") ? "webm" : "m4a";
      const fileName = `${user.id}/chat/audio/${Date.now()}.${extension}`;
      
      console.log("[CHAT][UPLOAD_AUDIO] Uploading to storage:", fileName);
      const { error: uploadError } = await supabase.storage.from("content").upload(fileName, audioBlob, {
        cacheControl: "3600",
        upsert: false,
        contentType: audioBlob.type
      });
      
      if (uploadError) {
        console.error("[CHAT][UPLOAD_AUDIO] Storage error:", uploadError);
        if (isAbortedStorageError(uploadError)) {
          console.error("[CHAT][UPLOAD_MEDIA_ERROR]", uploadError);
          toast.error("No se pudo subir el audio. Intenta de nuevo.");
          return;
        }
        if (uploadError.message?.includes("policy") || uploadError.message?.includes("403")) {
          toast.error("Permiso denegado (Storage/RLS). Revisar políticas de Supabase.");
        } else {
          toast.error("Error al subir audio");
        }
        return;
      }
      
      const { data: urlData } = supabase.storage.from("content").getPublicUrl(fileName);
      console.log("[CHAT][UPLOAD_AUDIO] Success:", urlData.publicUrl.slice(0, 50) + "...");
      
      onMediaReady(urlData.publicUrl, "audio");
      toast.success("Audio adjuntado");
      closeAudioModal();
    } catch (error) {
      console.error("[CHAT][UPLOAD_AUDIO] Exception:", error);
      if (isAbortedStorageError(error)) {
        console.error("[CHAT][UPLOAD_MEDIA_ERROR]", error);
        toast.error("No se pudo subir el audio. Intenta de nuevo.");
        return;
      }
      toast.error("Error al subir audio");
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const closeAudioModal = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    // Cleanup
    resetAudio();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
                onClick={closeAudioModal} 
                className="fixed inset-0 bg-black/50 z-[9999]" 
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
                  <button onClick={closeAudioModal} aria-label="Cerrar">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center py-6">
                  {!audioUrl ? (
                    // Recording UI
                    <>
                      <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${isRecording ? "bg-destructive/20 animate-pulse" : "bg-muted"}`}>
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
                  className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium mt-2"
                >
                  Cerrar
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
