import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Check, Loader2, AlertCircle, User, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImageModeration } from "@/hooks/useImageModeration";
import { toast } from "sonner";
import vfcLogo from "@/assets/vfc-logo.png";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export default function OnboardingSelfiePage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { moderateImageFile, isChecking: isModerating } = useImageModeration();
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous errors
    setModerationError(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Formato no soportado. Usa JPG, PNG o WebP.");
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("La imagen es muy grande. Máximo 5MB.");
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
  }, []);

  const handleRetake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setModerationError(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  const handleConfirm = useCallback(async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setModerationError(null);

    try {
      // MODERATION: Check image before uploading
      console.log("[OnboardingSelfiePage] Moderating selfie...");
      const modResult = await moderateImageFile(selectedFile, "profile");
      
      if (!modResult.allowed) {
        console.log("[OnboardingSelfiePage] Selfie failed moderation:", modResult.reason);
        setModerationError(modResult.reason || "Imagen no permitida. Toma otra foto.");
        setIsUploading(false);
        return;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/selfie_${timestamp}.${ext}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Error al subir la foto");
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(uploadData.path);

      // Update profile with photo URL and mark as completed
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          profile_photo_url: urlData.publicUrl,
          profile_photo_updated_at: new Date().toISOString(),
          profile_photo_completed: true,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        toast.error("Error al guardar la foto");
        setIsUploading(false);
        return;
      }

      // Refresh profile data
      await refreshProfile();

      toast.success("¡Foto de perfil guardada!");
      
      // Navigate to app
      navigate("/app", { replace: true });
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error inesperado");
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, user, refreshProfile, navigate, moderateImageFile]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isProcessing = isUploading || isModerating;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={vfcLogo}
              alt="VFC"
              className="w-20 h-20 object-contain mx-auto mb-4"
            />
            <h1 className="text-2xl font-gaming font-bold gradient-text mb-2">
              ¡Casi listo, {profile?.nick}!
            </h1>
            <p className="text-muted-foreground text-sm">
              Sube tu foto de perfil para que tus amigos te reconozcan
            </p>
          </div>

          {/* Photo Preview / Camera Button */}
          <div className="flex flex-col items-center gap-6">
            {previewUrl ? (
              // Preview mode
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-secondary shadow-lg">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-secondary flex items-center justify-center shadow-lg"
                >
                  <Check className="w-5 h-5 text-white" />
                </motion.div>
              </motion.div>
            ) : (
              // Camera button mode
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={triggerFileInput}
                className="w-48 h-48 rounded-full bg-card/50 border-4 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors"
              >
                <Camera className="w-12 h-12 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">
                  Toca para abrir cámara
                </span>
              </motion.button>
            )}

            {/* Hidden file input - frontal camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Instructions */}
            <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Centra tu cara en el círculo
                </p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Buena iluminación, sin filtros
                </p>
              </div>
            </div>

            {/* Moderation Error */}
            {moderationError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm flex items-start gap-3"
              >
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Foto no permitida</p>
                  <p className="text-xs mt-1 opacity-80">{moderationError}</p>
                  <p className="text-xs mt-2">Por favor, toma otra foto.</p>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            {previewUrl ? (
              <div className="flex gap-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="flex-1 py-4 rounded-2xl border-2 border-border/50 text-muted-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className="w-5 h-5" />
                  Repetir
                </motion.button>
                <motion.button
                  whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                  whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-gaming font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isModerating ? 'Verificando...' : 'Guardando...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirmar
                    </>
                  )}
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={triggerFileInput}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-gaming text-lg flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Tomar foto
              </motion.button>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Esta foto te identificará en la app.<br />
            Podrás cambiarla después desde tu perfil.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
