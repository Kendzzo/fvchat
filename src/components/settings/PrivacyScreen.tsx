import { motion } from 'framer-motion';
import { ArrowLeft, Eye, MessageSquare, Loader2 } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

interface Props {
  onBack: () => void;
}

export function PrivacyScreen({ onBack }: Props) {
  const { settings, isLoading, updateSettings } = useUserSettings();

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
          <h1 className="text-xl font-gaming font-bold">Privacidad</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Post Visibility */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">¿Quién puede ver mis publicaciones?</h2>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => updateSettings({ post_visibility: 'everyone' })}
            className={`w-full glass-card p-4 flex items-center gap-4 transition-colors ${
              settings?.post_visibility === 'everyone' ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              settings?.post_visibility === 'everyone' ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {settings?.post_visibility === 'everyone' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Todos</p>
              <p className="text-sm text-muted-foreground">Usuarios de tu grupo de edad</p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => updateSettings({ post_visibility: 'friends' })}
            className={`w-full glass-card p-4 flex items-center gap-4 transition-colors ${
              settings?.post_visibility === 'friends' ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              settings?.post_visibility === 'friends' ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {settings?.post_visibility === 'friends' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Solo amigos</p>
              <p className="text-sm text-muted-foreground">Solo tus amigos aprobados</p>
            </div>
          </motion.button>
        </div>

        {/* Message Permission */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">¿Quién puede escribirme?</h2>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => updateSettings({ message_permission: 'everyone' })}
            className={`w-full glass-card p-4 flex items-center gap-4 transition-colors ${
              settings?.message_permission === 'everyone' ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              settings?.message_permission === 'everyone' ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {settings?.message_permission === 'everyone' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Todos</p>
              <p className="text-sm text-muted-foreground">Cualquier usuario puede escribirte</p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => updateSettings({ message_permission: 'friends' })}
            className={`w-full glass-card p-4 flex items-center gap-4 transition-colors ${
              settings?.message_permission === 'friends' ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              settings?.message_permission === 'friends' ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {settings?.message_permission === 'friends' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Solo amigos</p>
              <p className="text-sm text-muted-foreground">Solo tus amigos aprobados</p>
            </div>
          </motion.button>
        </div>

        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Los cambios se guardan automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
