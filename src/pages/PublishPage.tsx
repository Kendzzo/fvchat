import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Video, X, Sparkles, Users, Lock, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePosts } from "@/hooks/usePosts";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { Progress } from "@/components/ui/progress";

// Emojis para stickers
const stickers = ["😀", "😂", "🥳", "🔥", "💯", "🎮", "🎨", "🎵", "⭐", "💪", "🏆", "❤️"];

// Palabras prohibidas
const bannedWords = ["tonto", "idiota", "estupido", "imbecil", "malo"];
export default function PublishPage() {
  const navigate = useNavigate();
  const {
    profile
  } = useAuth();
  const {
    createPost
  } = usePosts();
  const {
    uploadMedia,
    uploadProgress,
    resetProgress
  } = useMediaUpload();

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"select" | "edit" | "publish">("select");
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"friends_only" | "same_age_group">("friends_only");
  const [warning, setWarning] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const checkContent = (text: string) => {
    const lowerText = text.toLowerCase();
    for (const word of bannedWords) {
      if (lowerText.includes(word)) {
        setWarning("⚠️ Tu mensaje contiene palabras no permitidas");
        return false;
      }
    }
    if (/\d{9}/.test(text) || /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
      setWarning("⚠️ No compartas datos personales como teléfono o email");
      return false;
    }
    setWarning("");
    return true;
  };
  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCaption(value);
    checkContent(value);
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

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
    setMediaType(type);

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
    if (warning || isPublishing || !uploadedUrl) return;
    setIsPublishing(true);
    try {
      const {
        error
      } = await createPost({
        type: mediaType === 'photo' ? 'image' : 'video',
        content_url: uploadedUrl,
        text: caption || undefined,
        privacy: privacy
      });
      if (error) {
        setWarning(error.message);
      } else {
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
      resetProgress();
    } else {
      setStep("edit");
    }
  };
  return <div className="min-h-screen bg-purple-50">
      {/* Hidden file inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={e => handleFileSelect(e, 'photo')} className="hidden" />
      <input ref={videoInputRef} type="file" accept="video/*" capture="environment" onChange={e => handleFileSelect(e, 'video')} className="hidden text-white" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.button whileTap={{
          scale: 0.9
        }} onClick={handleBack} className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
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
        }} onClick={handlePublish} disabled={!!warning || isPublishing || !uploadedUrl} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground font-medium disabled:opacity-50 flex items-center gap-2">
              {isPublishing ? <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publicando...
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
            <p className="text-sm text-secondary-foreground">
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
          {/* Media Preview */}
          <div className="relative flex-1 bg-background">
            {mediaType === "video" ? <video src={previewUrl} controls className="w-full h-full object-contain" /> : <img src={previewUrl} alt="" className="w-full h-full object-contain" />}
            
            {/* Upload status badge */}
            {uploadedUrl && <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-500/90 text-white text-xs flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Subido
              </div>}
          </div>

          {/* Stickers */}
          <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Stickers del día
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {stickers.map(emoji => <motion.button key={emoji} whileTap={{
            scale: 0.9
          }} className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-2xl flex-shrink-0 hover:bg-muted transition-colors">
                  {emoji}
                </motion.button>)}
            </div>
          </div>
        </div>}

      {step === "publish" && <div className="p-6 space-y-6">
          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Escribe algo...
            </label>
            <textarea value={caption} onChange={handleCaptionChange} placeholder="¿Qué quieres contar? 😊" rows={4} className="input-gaming w-full resize-none" />
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
    </div>;
}