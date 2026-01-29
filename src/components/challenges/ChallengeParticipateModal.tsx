import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Video, X, Loader2, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ChallengeParticipateModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  challengeTitle: string;
  onSubmit: (contentUrl: string, visibility: "public" | "friends") => Promise<{ error?: Error | null }>;
  entriesRemaining: number;
}

export function ChallengeParticipateModal({
  isOpen,
  onClose,
  challengeTitle,
  onSubmit,
  entriesRemaining,
}: ChallengeParticipateModalProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"public" | "friends">("public");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size
    const maxSize = type === "image" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error(`Archivo muy grande. Máximo ${type === "image" ? "10MB" : "50MB"}`);
      return;
    }

    // Validate video duration (10s max)
    if (type === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 10) {
          toast.error("El vídeo debe durar máximo 10 segundos");
          return;
        }
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
      };
      video.src = URL.createObjectURL(selectedFile);
    } else {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Upload to Supabase storage
      const ext = file.name.split(".").pop();
      const path = `${user.id}/challenges/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("content").upload(path, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("content").getPublicUrl(path);

      // Submit entry
      const result = await onSubmit(publicUrl, visibility);

      if (result.error) {
        throw result.error;
      }

      // Reset and close
      setPreview(null);
      setFile(null);
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Error al subir el archivo");
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setPreview(null);
    setFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={resetModal}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-gaming font-bold text-lg">Participar</h2>
              <p className="text-sm text-muted-foreground">{challengeTitle}</p>
            </div>
            <button onClick={resetModal} className="p-2 hover:bg-muted rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Entries remaining */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i < 3 - entriesRemaining ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
              <span className="text-muted-foreground">{entriesRemaining} participaciones restantes</span>
            </div>

            {/* Preview or Upload */}
            {preview ? (
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                {file?.type.startsWith("video") ? (
                  <video src={preview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                )}
                <button
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileSelect(e, "image")}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                    <span className="font-medium">Foto</span>
                  </div>
                </label>

                <label className="cursor-pointer">
                  {/* Video input: NO capture for iPhone MOV compatibility */}
                  <input
                    type="file"
                    accept="video/*,video/quicktime,video/mp4"
                    onChange={(e) => handleFileSelect(e, "video")}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-secondary/30 hover:border-secondary/60 hover:bg-secondary/5 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Video className="w-8 h-8 text-secondary" />
                    </div>
                    <span className="font-medium">Vídeo</span>
                    <span className="text-xs text-muted-foreground">Máx 10s</span>
                  </div>
                </label>
              </div>
            )}

            {/* Visibility selector */}
            {preview && (
              <div className="space-y-2">
                <p className="text-sm font-medium">¿Quién puede verlo?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibility("public")}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      visibility === "public"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Todos
                  </button>
                  <button
                    onClick={() => setVisibility("friends")}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      visibility === "friends"
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : "border-border hover:border-secondary/50"
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    Solo amigos
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/50">
            <Button
              onClick={handleSubmit}
              disabled={!preview || isUploading}
              className="w-full btn-gaming py-4 rounded-2xl font-gaming"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Subiendo...
                </>
              ) : (
                "¡Participar!"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
