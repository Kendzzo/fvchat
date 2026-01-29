import { motion } from 'framer-motion';
import { ArrowLeft, User, Calendar, Shield, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  onBack: () => void;
}

export function AccountInfoScreen({ onBack }: Props) {
  const { profile } = useAuth();

  const infoItems = [
    {
      icon: User,
      label: 'Nick',
      value: `@${profile?.nick || 'Usuario'}`
    },
    {
      icon: Users,
      label: 'Grupo de edad',
      value: profile?.age_group || '13-16'
    },
    {
      icon: Calendar,
      label: 'Fecha de creación',
      value: profile?.created_at 
        ? format(new Date(profile.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })
        : 'No disponible'
    },
    {
      icon: Shield,
      label: 'Aprobación parental',
      value: profile?.parent_approved ? '✓ Aprobada' : '⏳ Pendiente'
    }
  ];

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
          <h1 className="text-xl font-gaming font-bold">Información de la cuenta</h1>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {infoItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="font-medium">{item.value}</p>
            </div>
          </motion.div>
        ))}

        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Esta información es de solo lectura.
          </p>
        </div>
      </div>
    </div>
  );
}
