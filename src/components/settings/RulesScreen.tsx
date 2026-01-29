import { motion } from 'framer-motion';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export function RulesScreen({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 rounded-xl bg-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-xl font-gaming font-bold">Normas y seguridad</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Community Guidelines */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">Normas de la comunidad</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>🤝 <strong>Respeto:</strong> Trata a todos con amabilidad y respeto.</p>
            <p>🚫 <strong>No bullying:</strong> No se tolera el acoso ni las burlas.</p>
            <p>🔒 <strong>Privacidad:</strong> No compartas información personal tuya ni de otros.</p>
            <p>📸 <strong>Contenido apropiado:</strong> Solo publica contenido adecuado para todas las edades.</p>
            <p>🎮 <strong>Diversión sana:</strong> Participa en los desafíos de forma positiva.</p>
            <p>👨‍👩‍👧 <strong>Supervisión parental:</strong> Tu tutor puede ver tu actividad.</p>
          </div>
        </motion.div>

        {/* Terms of Use */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">Términos de uso</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>📱 VFC Kids Connect es una red social segura diseñada exclusivamente para menores de edad.</p>
            <p>👮 Todo el contenido es moderado por inteligencia artificial y moderadores humanos para garantizar un entorno seguro.</p>
            <p>📧 La cuenta requiere aprobación de un tutor legal para acceder a todas las funcionalidades.</p>
            <p>⚠️ El incumplimiento de las normas puede resultar en suspensión temporal o permanente de la cuenta.</p>
            <p>🔐 Nos comprometemos a proteger la privacidad y seguridad de todos nuestros usuarios.</p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            Última actualización: Enero 2026
          </p>
        </div>
      </div>
    </div>
  );
}
