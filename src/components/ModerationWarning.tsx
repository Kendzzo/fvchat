import { AlertCircle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface ModerationWarningProps {
  reason: string;
  strikes?: number;
  onDismiss?: () => void;
}

export function ModerationWarning({ reason, strikes, onDismiss }: ModerationWarningProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-destructive/20 border border-destructive/40 text-destructive px-4 py-3 rounded-xl"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-sm">No puedes enviar este mensaje</p>
          <p className="text-xs opacity-80 mt-1">{reason}</p>
          {strikes !== undefined && strikes > 0 && (
            <p className="text-xs opacity-60 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {strikes}/3 avisos en las últimas 24h
              {strikes >= 2 && ' - Próximo aviso bloqueará tu cuenta'}
            </p>
          )}
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}
