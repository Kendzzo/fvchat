import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuspensionBannerProps {
  until: Date;
  formatTime: () => string;
}

export function SuspensionBanner({ until, formatTime }: SuspensionBannerProps) {
  const timeString = until.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-destructive/20 border border-destructive/40 text-destructive px-4 py-3 rounded-xl flex items-center gap-3"
    >
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-sm">Cuenta bloqueada por seguridad</p>
        <p className="text-xs opacity-80">
          Podrás enviar mensajes de nuevo a las {timeString} ({formatTime()} restantes)
        </p>
      </div>
    </motion.div>
  );
}
