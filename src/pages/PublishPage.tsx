import { motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Video, X, Sparkles, Users, Lock, AlertCircle, Loader2, CheckCircle, Sticker, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePosts } from "@/hooks/usePosts";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useModeration } from "@/hooks/useModeration";
import { useImageModeration } from "@/hooks/useImageModeration";
import { useStickers } from "@/hooks/useStickers";
import { Progress } from "@/components/ui/progress";
import { SuspensionBanner } from "@/components/SuspensionBanner";
import { ModerationWarning } from "@/components/ModerationWarning";
import { StickerPicker } from "@/components/StickerPicker";
import { StickerOverlay, PlacedSticker } from "@/components/StickerOverlay";
import { supabase } from "@/integrations/supabase/client";

export default function PublishPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { createPost } = usePosts();
  const { uploadMedia, uploadProgress, resetProgress } = useMediaUpload();
  const { checkContent, isChecking, suspensionInfo, formatSuspensionTime, checkSuspension } = useModeration();
  const { moderateImageFile, isChecking: isModeratingImage } = useImageModeration();
  const { getAvailableStickers } = useStickers();
  const availableStickers = getAvailableStickers();

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  const [step, setStep] = useState<"select" | "edit" | "publish">("select");
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"friends_only" | "same_age_group">("friends_only");
  const [warning, setWarning] = useState("");
  const [moderationError, setModerationError] = useState<{ reason: string; strikes?: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [imageModerationError, setImageModerationError] = useState<string | null>(null);
  
  // Sticker overlay state
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Check suspension on mount
  useEffect(() => {
    checkSuspension();
  }, [checkSuspension]);

  const isSuspended = suspensionInfo.suspended && suspensionInfo.until && suspensionInfo.until > new Date();

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCaption(value);
    setModerationError(null);
    setWarning("");
  };
  const handlePhotoClick = () => {
    photoInputRef.current?.click();
  };
  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    resetProgress();
    setWarning("");
    setUploadedUrl(null);
    setImageModerationError(null);

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
    setMediaType(type);

    // MODERATION: Check image before upload (photos only)
    if (type === 'photo') {
      console.log("[PublishPage] Moderating image before upload...");
      const modResult = await moderateImageFile(file, "post");
      
      if (!modResult.allowed) {
        console.log("[PublishPage] Image failed moderation:", modResult.reason);
        setImageModerationError(modResult.reason || "Imagen no permitida");
        // Keep preview but don't upload
        return;
      }
    }

    // Upload file
    const {
      url,
      error
    } = await uploadMedia(file, type === 'photo' ? 'image' : 'video');
    if (error) {
      setWarning(error.message);
      // Keep preview for retry
    } else if (url) {
      setUploadedUrl(url);
      setStep("edit");
    }
  };
  const handlePublish = async () => {
    if (warning || isPublishing || !uploadedUrl || isChecking) return;

    // Check suspension first
    if (isSuspended) {
      return;
    }

    setModerationError(null);

    // Check caption with moderation (if there's text)
    if (caption.trim()) {
      const result = await checkContent(caption, 'post');
      
      if (!result.allowed) {
        setModerationError({ reason: result.reason || 'Contenido no permitido', strikes: result.strikes });
        return;
      }
    }

    setIsPublishing(true);
    try {
      const { data: postData, error } = await createPost({
        type: mediaType === 'photo' ? 'image' : 'video',
        content_url: uploadedUrl,
        text: caption || undefined,
        privacy: privacy
      });
      
      if (error) {
        setWarning(error.message);
      } else if (postData) {
        // Save stickers to post_stickers
        if (placedStickers.length > 0) {
          const stickersToInsert = placedStickers.map(s => ({
            post_id: postData.id,
            sticker_id: s.sticker.id,
            x: s.x,
            y: s.y,
            scale: s.scale,
            rotation: s.rotation
          }));
          
          const { error: stickersError } = await supabase
            .from('post_stickers')
            .insert(stickersToInsert);
            
          if (stickersError) {
            console.error('Error saving stickers:', stickersError);
          }
        }
        
        // Clean up preview URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        navigate("/app");
      }
    } catch (err) {
      setWarning("Error al publicar");
    } finally {
      setIsPublishing(false);
    }
  };
  const handleBack = () => {
    if (step === "select") {
      navigate("/app");
    } else if (step === "edit") {
      setStep("select");
      setSelectedFile(null);
      setMediaType(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setUploadedUrl(null);
      setPlacedStickers([]);
      resetProgress();
    } else {
      setStep("edit");
    }
  };
  
  // Sticker handlers
  const handleAddSticker = useCallback((sticker: typeof availableStickers[0]) => {
    const newPlacedSticker: PlacedSticker = {
      id: crypto.randomUUID(),
      sticker: sticker,
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0
    };
    setPlacedStickers(prev => [...prev, newPlacedSticker]);
    setShowStickerPicker(false);
  }, []);
  
  const handleUpdateSticker = useCallback((id: string, updates: Partial<PlacedSticker>) => {
    setPlacedStickers(prev => 
      prev.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  }, []);
  
  const handleRemoveSticker = useCallback((id: string) => {
    setPlacedStickers(prev => prev.filter(s => s.id !== id));
  }, []);
  return <div className="min-h-screen bg-purple-50">
      {/* Hidden file inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={e => handleFileSelect(e, 'photo')} className="hidden" />
      {/* Video input: NO capture attribute for iPhone compatibility with MOV files */}
      <input ref={videoInputRef} type="file" accept="video/*,video/quicktime,video/mp4" onChange={e => handleFileSelect(e, 'video')} className="hidden" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.button whileTap={{
          scale: 0.9
        }} onClick={handleBack} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5 text-white" />
          </motion.button>
          <h1 className="font-gaming font-bold text-2xl">
            {step === "select" ? "Nueva publicación" : step === "edit" ? "Editar" : "Publicar"}
          </h1>
          {step === "edit" && uploadedUrl && <motion.button whileTap={{
          scale: 0.9
        }} onClick={() => setStep("publish")} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium">
              Siguiente
            </motion.button>}
          {step === "publish" && <motion.button whileTap={{
          scale: 0.9
        }} onClick={handlePublish} disabled={!!warning || !!moderationError || isPublishing || !uploadedUrl || isChecking || isSuspended} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground font-medium disabled:opacity-50 flex items-center gap-2">
              {isPublishing || isChecking ? <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isChecking ? 'Verificando...' : 'Publicando...'}
                </> : "Publicar"}
            </motion.button>}
          {step === "select" && <div className="w-10" />}
        </div>
      </header>

      {/* Content */}
      {step === "select" && <div className="p-6 space-y-6 bg-purple-50 mt-0">
          <div className="text-center mb-8">
            <h2 className="font-gaming font-bold gradient-text mb-2 text-3xl">
              ¿Qué compartimos hoy?
            </h2>
            <p className="text-secondary-foreground text-base">
              Elige el tipo de contenido
            </p>
          </div>

          {/* Upload Progress */}
          {uploadProgress.status !== 'idle' && <motion.div initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                {uploadProgress.status === 'uploading' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                {uploadProgress.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {uploadProgress.status === 'error' && <AlertCircle className="w-5 h-5 text-destructive" />}
                <span className="text-sm font-medium">{uploadProgress.message}</span>
              </div>
              {uploadProgress.status === 'uploading' && <Progress value={uploadProgress.progress} className="h-2" />}
            </motion.div>}

          {/* Preview if file selected but still on select step */}
          {previewUrl && step === "select" && <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground mb-2">Vista previa</p>
              {mediaType === 'video' ? <video src={previewUrl} controls className="w-full max-h-48 rounded-lg object-contain bg-black" /> : <img src={previewUrl} alt="Preview" className="w-full max-h-48 rounded-lg object-contain" />}
            </div>}

          <div className="grid grid-cols-2 gap-4">
            <motion.button whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} onClick={handlePhotoClick} disabled={uploadProgress.status === 'uploading'} className="glass-card p-8 flex flex-col items-center px-[30px] font-normal gap-[16px] disabled:opacity-50">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-primary to-neon-pink flex items-center justify-center">
                <Camera className="w-10 h-10 text-foreground" />
              </div>
              <span className="font-gaming font-semibold">Una FoTinGui</span>
              <span className="text-xs text-muted-foreground">Máx. 10MB</span>
            </motion.button>

            <motion.button whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} onClick={handleVideoClick} disabled={uploadProgress.status === 'uploading'} className="glass-card p-8 flex flex-col items-center gap-4 disabled:opacity-50">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-secondary to-accent flex items-center justify-center">
                <Video className="w-10 h-10 text-foreground" />
              </div>
              <span className="font-gaming font-semibold">Un PedazO de VídeO</span>
              <span className="text-xs text-muted-foreground">Máx. 10 seg</span>
            </motion.button>
          </div>

          {/* Image Moderation Error */}
          {imageModerationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm flex items-start gap-3"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Imagen no permitida</p>
                <p className="text-xs mt-1 opacity-80">{imageModerationError}</p>
                <p className="text-xs mt-2">Por favor, elige otra imagen.</p>
              </div>
            </motion.div>
          )}

          {warning && <motion.div initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {warning}
            </motion.div>}
        </div>}

      {step === "edit" && previewUrl && <div className="flex flex-col h-[calc(100vh-60px)]">
          {/* Media Preview with Sticker Overlay */}
          <div 
            ref={imageContainerRef}
            className="relative flex-1 bg-background overflow-hidden"
          >
            {mediaType === "video" ? (
              <video src={previewUrl} controls className="w-full h-full object-contain" />
            ) : (
              <>
                <img src={previewUrl} alt="" className="w-full h-full object-contain" />
                <StickerOverlay
                  stickers={placedStickers}
                  onUpdateSticker={handleUpdateSticker}
                  onRemoveSticker={handleRemoveSticker}
                  editable={true}
                  containerRef={imageContainerRef}
                />
              </>
            )}
            
            {/* Upload status badge */}
            {uploadedUrl && <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-500/90 text-white text-xs flex items-center gap-1 z-20">
                <CheckCircle className="w-3 h-3" />
                Subido
              </div>}
          </div>

          {/* Sticker Controls */}
          <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Stickers {placedStickers.length > 0 && `(${placedStickers.length})`}
              </p>
              {mediaType === "photo" && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowStickerPicker(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium"
                >
                  <Sticker className="w-4 h-4" />
                  Añadir sticker
                </motion.button>
              )}
            </div>
            
            {placedStickers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Toca un sticker para moverlo, escalarlo o rotarlo
              </p>
            )}
          </div>
        </div>}

      {step === "publish" && <div className="p-6 space-y-6">
          {/* Suspension Banner */}
          {isSuspended && suspensionInfo.until && (
            <SuspensionBanner until={suspensionInfo.until} formatTime={formatSuspensionTime} />
          )}

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Escribe algo...
            </label>
            <textarea 
              value={caption} 
              onChange={handleCaptionChange} 
              placeholder={isSuspended ? "Cuenta bloqueada temporalmente" : "¿Qué quieres contar? 😊"} 
              rows={4} 
              className="input-gaming w-full resize-none" 
              disabled={isSuspended}
            />
            
            {/* Moderation Warning */}
            {moderationError && (
              <ModerationWarning 
                reason={moderationError.reason} 
                strikes={moderationError.strikes}
                onDismiss={() => setModerationError(null)}
              />
            )}
            
            {warning && <motion.div initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {warning}
              </motion.div>}
          </div>

          {/* Privacy */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              ¿Quién puede verlo?
            </label>

            <div className="space-y-2">
              <motion.button whileTap={{
            scale: 0.98
          }} onClick={() => setPrivacy("friends_only")} className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${privacy === "friends_only" ? "border-secondary bg-secondary/10" : "border-border/50 bg-card"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${privacy === "friends_only" ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Solo amigos</p>
                  <p className="text-xs text-muted-foreground">Solo tus amigos pueden ver esto</p>
                </div>
                {privacy === "friends_only" && <div className="ml-auto w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-secondary-foreground text-xs">✓</span>
                  </div>}
              </motion.button>

              <motion.button whileTap={{
            scale: 0.98
          }} onClick={() => setPrivacy("same_age_group")} className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${privacy === "same_age_group" ? "border-secondary bg-secondary/10" : "border-border/50 bg-card"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${privacy === "same_age_group" ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}>
                  👥
                </div>
                <div className="text-left">
                  <p className="font-medium">Mi franja de edad</p>
                  <p className="text-xs text-muted-foreground">Usuarios de tu misma edad</p>
                </div>
                {privacy === "same_age_group" && <div className="ml-auto w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-secondary-foreground text-xs">✓</span>
                  </div>}
              </motion.button>
            </div>
          </div>

          {/* Preview */}
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-3">Vista previa</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-lg">
                  {(profile?.avatar_data as any)?.emoji || "🎮"}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">@{profile?.nick || "TuNick"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {caption || "Tu texto aparecerá aquí..."}
                </p>
                {previewUrl && <div className="mt-2 rounded-lg overflow-hidden">
                    {mediaType === "video" ? <video src={previewUrl} className="w-full max-h-32 object-cover" muted /> : <img src={previewUrl} alt="Preview" className="w-full max-h-32 object-cover" />}
                  </div>}
              </div>
            </div>
          </div>
        </div>}
        
      {/* Sticker Picker Modal */}
      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={handleAddSticker}
      />
    </div>;
}