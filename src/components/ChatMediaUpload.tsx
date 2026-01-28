import { useRef, useState } from "react";
import { Image, Mic, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface ChatMediaUploadProps {
  onMediaReady: (url: string, type: "image" | "audio") => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * ChatMediaUpload - ONLY for images and audio in chat
 * Videos are NOT allowed in chat - they go through PublishPage only
 */
export function ChatMediaUpload({ onMediaReady, disabled }: ChatMediaUploadProps) {
  const { user } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);

  const handleImageClick = () => {
    if (disabled || isUploading) return;
    imageInputRef.current?.click();
  };

  const handleAudioClick = () => {
    if (disabled || isUploading) return;
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
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/chat/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("content")
        .upload(fileName, file, { 
          cacheControl: "3600", 
          upsert: false,
          contentType: file.type || "image/jpeg"
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("content").getPublicUrl(fileName);

      onMediaReady(urlData.publicUrl, "image");
      toast.success("Imagen adjuntada");
    } catch (error) {
      console.error("Upload error:", error);
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

  const closeAudioModal = () => setShowAudioModal(false);

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
        disabled={disabled || isUploading}
        className="p-3 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Image className="w-5 h-5" />
        )}
      </button>

      {/* Audio button */}
      <button
        onClick={handleAudioClick}
        disabled={disabled || isUploading}
        className="p-3 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <Mic className="w-5 h-5" />
      </button>

      {/* Audio modal - Portal to body (fix iOS) */}
      <AnimatePresence>
        {showAudioModal &&
          createPortal(
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeAudioModal}
                className="fixed inset-0 bg-black/50 z-[9999]"
              />
              <motion.div
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
                  <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Función en desarrollo</p>
                  <p className="text-sm text-muted-foreground mt-2">Pronto podrás enviar notas de voz</p>
                </div>

                <button
                  onClick={closeAudioModal}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
                >
                  Entendido
                </button>
              </motion.div>
            </>,
            document.body,
          )}
      </AnimatePresence>
    </>
  );
}
