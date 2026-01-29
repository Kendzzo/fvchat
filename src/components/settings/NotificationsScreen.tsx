import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Mail, Trophy, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useUserSettings } from '@/hooks/useUserSettings';

interface Props {
  onBack: () => void;
}

export function NotificationsScreen({ onBack }: Props) {
  const { settings, isLoading, updateSettings } = useUserSettings();

  const notificationItems = [
    {
      icon: Heart,
      label: 'Likes',
      description: 'Cuando alguien le da like a tu publicación',
      key: 'notify_likes' as const
    },
    {
      icon: MessageCircle,
      label: 'Comentarios',
      description: 'Cuando alguien comenta en tu publicación',
      key: 'notify_comments' as const
    },
    {
      icon: Mail,
      label: 'Mensajes',
      description: 'Cuando recibes un nuevo mensaje',
      key: 'notify_messages' as const
    },
    {
      icon: Trophy,
      label: 'Desafíos diarios',
      description: 'Recordatorios de nuevos desafíos',
      key: 'notify_challenges' as const
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <h1 className="text-xl font-gaming font-bold">Notificaciones</h1>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {notificationItems.map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <Switch
              checked={settings?.[item.key] ?? true}
              onCheckedChange={(checked) => updateSettings({ [item.key]: checked })}
            />
          </motion.div>
        ))}

        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Los cambios se guardan automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
