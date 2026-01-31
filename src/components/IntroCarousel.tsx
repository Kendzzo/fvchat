import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Camera, 
  MessageCircle, 
  Swords, 
  Shield, 
  ChevronRight,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IntroCarouselProps {
  userId: string;
  canInteract: boolean;
  onComplete: () => void;
}

interface Slide {
  id: number;
  icon: React.ReactNode;
  title: string;
  text: string;
  highlight?: "publish" | "chat" | "challenges";
}

const slides: Slide[] = [
  {
    id: 1,
    icon: <span className="text-5xl">👋</span>,
    title: "Bienvenido a VFC",
    text: "Aquí podrás descubrir contenido, chatear con amigos y completar desafíos.",
  },
  {
    id: 2,
    icon: <Camera className="w-12 h-12 text-primary" />,
    title: "📸 Publicar",
    text: "Aquí compartes tus fotos y vídeos con tus amigos.",
    highlight: "publish",
  },
  {
    id: 3,
    icon: <MessageCircle className="w-12 h-12 text-secondary" />,
    title: "💬 Chats",
    text: "Aquí hablas con tus amigos y compartes stickers.",
    highlight: "chat",
  },
  {
    id: 4,
    icon: <Swords className="w-12 h-12 text-warning" />,
    title: "🏆 Desafíos",
    text: "Completa desafíos y gana stickers únicos.",
    highlight: "challenges",
  },
  {
    id: 5,
    icon: <Shield className="w-12 h-12 text-success" />,
    title: "🛡️ Cuenta en modo seguro",
    text: "", // Will be set dynamically based on canInteract
  },
];

// Mini navbar component for highlighting
function MiniNavbar({ highlight }: { highlight?: string }) {
  const items = [
    { id: "home", icon: Home, label: "Home" },
    { id: "chat", icon: MessageCircle, label: "Chat" },
    { id: "publish", icon: Camera, label: "Publicar", isMain: true },
    { id: "challenges", icon: Swords, label: "Desafíos" },
  ];

  return (
    <div className="flex items-center justify-center gap-3 mt-6 p-3 rounded-2xl bg-card/50 border border-border/30">
      {items.map((item) => {
        const Icon = item.icon;
        const isHighlighted = item.id === highlight;
        return (
          <div
            key={item.id}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              isHighlighted 
                ? "bg-primary/20 ring-2 ring-primary scale-110" 
                : "opacity-50"
            }`}
          >
            {item.isMain ? (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
            ) : (
              <Icon className={`w-6 h-6 ${isHighlighted ? "text-primary" : "text-muted-foreground"}`} />
            )}
            <span className={`text-[10px] ${isHighlighted ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function IntroCarousel({ userId, canInteract, onComplete }: IntroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    setCurrentSlide(slides.length - 1); // Go to last slide
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ intro_completed: true })
        .eq("id", userId);

      if (error) {
        console.error("[IntroCarousel] Error completing intro:", error);
        toast.error("Error al guardar. Inténtalo de nuevo.");
        return;
      }

      onComplete();
    } catch (err) {
      console.error("[IntroCarousel] Error:", err);
      toast.error("Error al guardar");
    } finally {
      setIsCompleting(false);
    }
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const showSkip = currentSlide < 3; // Show skip only on slides 1-3

  // Dynamic text for last slide based on canInteract
  const lastSlideText = canInteract
    ? "✅ Tu cuenta ya está aprobada. ¡Puedes usar todo!"
    : "Ahora puedes explorar y ver todo.\n\nPara publicar, chatear o enviar stickers, tu tutor debe aprobar tu cuenta.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-8 pb-4">
        {slides.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 rounded-full transition-all ${
              idx === currentSlide 
                ? "w-8 bg-primary" 
                : idx < currentSlide 
                  ? "w-2 bg-primary/50" 
                  : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-sm"
          >
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 rounded-3xl bg-card flex items-center justify-center shadow-lg">
                {slide.icon}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-gaming font-bold mb-4 gradient-text">
              {slide.title}
            </h2>

            {/* Text */}
            <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-line">
              {isLastSlide ? lastSlideText : slide.text}
            </p>

            {/* Mini navbar highlight */}
            {slide.highlight && <MiniNavbar highlight={slide.highlight} />}

            {/* Approved badge for last slide if canInteract */}
            {isLastSlide && canInteract && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Cuenta aprobada</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="p-6 pb-10 space-y-3">
        {isLastSlide ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-gaming font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isCompleting ? (
              <span className="animate-pulse">Guardando...</span>
            ) : (
              <>
                Entendido
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-gaming font-bold text-lg flex items-center justify-center gap-2"
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </motion.button>

            {showSkip && (
              <button
                onClick={handleSkip}
                className="w-full py-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Saltar
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
