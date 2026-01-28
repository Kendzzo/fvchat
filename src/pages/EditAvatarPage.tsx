import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const READY_PLAYER_ME_SUBDOMAIN = "vfc-kids";

export default function EditAvatarPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Get existing avatar ID if available
  const existingAvatarId = (profile?.avatar_data as any)?.avatar_id;

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.source === 'readyplayerme') {
        if (event.data.eventName === 'v1.avatar.exported') {
          const avatarModelUrl = event.data.data.url;
          await saveAvatar(avatarModelUrl);
        }
        if (event.data.eventName === 'v1.frame.ready') {
          setIsLoading(false);
        }
      }
      
      if (typeof event.data === 'string' && event.data.includes('.glb')) {
        await saveAvatar(event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  const saveAvatar = async (modelUrl: string) => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    try {
      const avatarId = modelUrl.split('/').pop()?.replace('.glb', '') || '';
      const snapshotUrl = `https://models.readyplayer.me/${avatarId}.png?size=256`;

      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_snapshot_url: snapshotUrl,
          avatar_data: { 
            model_url: modelUrl,
            provider: 'readyplayerme',
            avatar_id: avatarId
          }
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving avatar:', error);
        toast.error('Error al actualizar avatar');
        return;
      }

      toast.success('¡Avatar actualizado!');
      await refreshProfile?.();
      navigate('/app/profile');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al actualizar avatar');
    } finally {
      setIsSaving(false);
    }
  };

  // Ready Player Me iframe URL - with existing avatar if available
  const iframeUrl = existingAvatarId
    ? `https://${READY_PLAYER_ME_SUBDOMAIN}.readyplayer.me/avatar?frameApi&avatarId=${existingAvatarId}`
    : `https://${READY_PLAYER_ME_SUBDOMAIN}.readyplayer.me/avatar?frameApi&clearCache&bodyType=halfbody`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-card"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-gaming font-bold">Editar Avatar</h1>
          </div>
        </div>
      </header>

      {/* Loading overlay */}
      {(isLoading || isSaving) && (
        <div className="absolute inset-0 z-50 bg-background/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">
              {isSaving ? 'Guardando cambios...' : 'Cargando editor...'}
            </p>
          </div>
        </div>
      )}

      {/* Ready Player Me iframe */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          className="w-full h-full absolute inset-0 border-0"
          allow="camera *; microphone *; clipboard-write"
          title="Ready Player Me Avatar Editor"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-card/50 backdrop-blur-sm border-t border-border/30"
      >
        <p className="text-center text-sm text-muted-foreground">
          ✏️ Modifica tu avatar y pulsa "Next" para guardar los cambios
        </p>
      </motion.div>
    </div>
  );
}
