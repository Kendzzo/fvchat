import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Video, Image, X, Sparkles, Users, Lock, AlertCircle } from "lucide-react";

// Emojis para stickers
const stickers = ["😀", "😂", "🥳", "🔥", "💯", "🎮", "🎨", "🎵", "⭐", "💪", "🏆", "❤️"];

// Palabras prohibidas (ejemplo básico)
const bannedWords = ["tonto", "idiota", "estupido", "imbecil", "malo"];

export default function PublishPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"select" | "edit" | "publish">("select");
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"friends" | "age">("friends");
  const [warning, setWarning] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const checkContent = (text: string) => {
    const lowerText = text.toLowerCase();
    for (const word of bannedWords) {
      if (lowerText.includes(word)) {
        setWarning("⚠️ Tu mensaje contiene palabras no permitidas");
        return false;
      }
    }
    // Check for personal data patterns
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

  const handlePublish = () => {
    if (warning) return;
    // TODO: Implement actual publishing
    navigate("/app");
  };

  // Mock image for demo
  const mockImage = "https://images.unsplash.com/photo-1493711662062-fa541f7f2b3e?w=600&h=600&fit=crop";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (step === "select") navigate("/app");
              else if (step === "edit") setStep("select");
              else setStep("edit");
            }}
            className="p-2 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
          <h1 className="text-lg font-gaming font-bold">
            {step === "select" ? "Nueva publicación" : step === "edit" ? "Editar" : "Publicar"}
          </h1>
          {step === "edit" && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setStep("publish")}
              className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium"
            >
              Siguiente
            </motion.button>
          )}
          {step === "publish" && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePublish}
              disabled={!!warning}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground font-medium disabled:opacity-50"
            >
              Publicar
            </motion.button>
          )}
          {step === "select" && <div className="w-10" />}
        </div>
      </header>

      {/* Content */}
      {step === "select" && (
        <div className="p-6 space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-gaming font-bold gradient-text mb-2">
              ¿Qué quieres compartir?
            </h2>
            <p className="text-muted-foreground text-sm">
              Elige el tipo de contenido
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setMediaType("photo");
                setSelectedImage(mockImage);
                setStep("edit");
              }}
              className="glass-card p-8 flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-primary to-neon-pink flex items-center justify-center">
                <Camera className="w-10 h-10 text-foreground" />
              </div>
              <span className="font-gaming font-semibold">Foto</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setMediaType("video");
                setSelectedImage(mockImage);
                setStep("edit");
              }}
              className="glass-card p-8 flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-secondary to-accent flex items-center justify-center">
                <Video className="w-10 h-10 text-foreground" />
              </div>
              <span className="font-gaming font-semibold">Vídeo</span>
              <span className="text-xs text-muted-foreground">Máx. 10 seg</span>
            </motion.button>
          </div>

          {/* Gallery Preview */}
          <div className="mt-8">
            <h3 className="font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Galería reciente
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setMediaType("photo");
                    setSelectedImage(mockImage);
                    setStep("edit");
                  }}
                  className="aspect-square rounded-xl bg-card border border-border/50 overflow-hidden"
                >
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "edit" && selectedImage && (
        <div className="flex flex-col h-[calc(100vh-60px)]">
          {/* Image Preview */}
          <div className="relative flex-1 bg-background">
            <img
              src={selectedImage}
              alt=""
              className="w-full h-full object-contain"
            />
            {mediaType === "video" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm text-sm">
                <span className="text-secondary font-medium">00:08</span> / 00:10
              </div>
            )}
          </div>

          {/* Stickers */}
          <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Stickers del día
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {stickers.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-2xl flex-shrink-0 hover:bg-muted transition-colors"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "publish" && (
        <div className="p-6 space-y-6">
          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Escribe algo...
            </label>
            <textarea
              value={caption}
              onChange={handleCaptionChange}
              placeholder="¿Qué quieres contar? 😊"
              rows={4}
              className="input-gaming w-full resize-none"
            />
            {warning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {warning}
              </motion.div>
            )}
          </div>

          {/* Privacy */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              ¿Quién puede verlo?
            </label>
            
            <div className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setPrivacy("friends")}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                  privacy === "friends"
                    ? "border-secondary bg-secondary/10"
                    : "border-border/50 bg-card"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  privacy === "friends" ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Solo amigos</p>
                  <p className="text-xs text-muted-foreground">Solo tus amigos pueden ver esto</p>
                </div>
                {privacy === "friends" && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-secondary-foreground text-xs">✓</span>
                  </div>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setPrivacy("age")}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                  privacy === "age"
                    ? "border-secondary bg-secondary/10"
                    : "border-border/50 bg-card"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  privacy === "age" ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"
                }`}>
                  👥
                </div>
                <div className="text-left">
                  <p className="font-medium">Mi franja de edad</p>
                  <p className="text-xs text-muted-foreground">Usuarios de tu misma edad</p>
                </div>
                {privacy === "age" && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-secondary-foreground text-xs">✓</span>
                  </div>
                )}
              </motion.button>
            </div>
          </div>

          {/* Preview */}
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-3">Vista previa</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-lg">
                  🎮
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">@TuNick</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {caption || "Tu texto aparecerá aquí..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
