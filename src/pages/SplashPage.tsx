import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import vfcLogo from "@/assets/vfc-logo.png";
export default function SplashPage() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);
  return <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" style={{
        animationDelay: "1s"
      }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-cyan/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <motion.div initial={{
      scale: 0,
      opacity: 0
    }} animate={{
      scale: showContent ? 1 : 0,
      opacity: showContent ? 1 : 0
    }} transition={{
      type: "spring",
      stiffness: 200,
      damping: 20
    }} className="relative z-10">
        <img src={vfcLogo} alt="VFC - Vídeos · Fotos · Chat" className="w-64 h-64 object-contain drop-shadow-2xl" />
      </motion.div>

      {/* Tagline */}
      <motion.div initial={{
      y: 20,
      opacity: 0
    }} animate={{
      y: showContent ? 0 : 20,
      opacity: showContent ? 1 : 0
    }} transition={{
      delay: 0.3,
      duration: 0.5
    }} className="text-center mt-6 z-10">
        <h1 className="text-2xl font-gaming font-bold gradient-text mb-2">
          Vídeos · Fotos · Chat
        </h1>
        <p className="text-muted-foreground text-sm">Esta si es tu red social, Bro..!  </p>
      </motion.div>

      {/* Safe Badge */}
      <motion.div initial={{
      y: 20,
      opacity: 0
    }} animate={{
      y: showContent ? 0 : 20,
      opacity: showContent ? 1 : 0
    }} transition={{
      delay: 0.5,
      duration: 0.5
    }} className="mt-4 badge-safe z-10">
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
        100% Seguro para menores
      </motion.div>

      {/* Buttons */}
      <motion.div initial={{
      y: 30,
      opacity: 0
    }} animate={{
      y: showContent ? 0 : 30,
      opacity: showContent ? 1 : 0
    }} transition={{
      delay: 0.7,
      duration: 0.5
    }} className="mt-12 flex flex-col gap-4 w-full max-w-xs px-6 z-10">
        <motion.button whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }} onClick={() => navigate("/register")} className="btn-gaming py-4 rounded-2xl text-foreground font-gaming text-lg">
          ¡Empezar!
        </motion.button>

        <motion.button whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }} onClick={() => navigate("/login")} className="py-4 rounded-2xl border-2 font-gaming text-lg transition-all text-white border-white">
          Ya tengo cuenta
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.p initial={{
      opacity: 0
    }} animate={{
      opacity: showContent ? 0.5 : 0
    }} transition={{
      delay: 1,
      duration: 0.5
    }} className="absolute bottom-8 text-xs text-muted-foreground z-10">
        Para niños de 6 a 16 años · Control parental obligatorio
      </motion.p>
    </div>;
}