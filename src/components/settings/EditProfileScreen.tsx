import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { ProfilePhotoEditor } from '@/components/ProfilePhotoEditor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  onBack: () => void;
}

export function EditProfileScreen({ onBack }: Props) {
  const { profile, user, refreshProfile } = useAuth();
  const [nick, setNick] = useState(profile?.nick || '');
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !nick.trim()) return;

    // Validate nick
    const normalizedNick = nick.trim().toLowerCase().replace(/^@/, '');
    if (normalizedNick.length < 3) {
      toast({
        title: 'Error',
        description: 'El nick debe tener al menos 3 caracteres',
        variant: 'destructive'
      });
      return;
    }

    if (normalizedNick.length > 20) {
      toast({
        title: 'Error',
        description: 'El nick no puede tener más de 20 caracteres',
        variant: 'destructive'
      });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(normalizedNick)) {
      toast({
        title: 'Error',
        description: 'El nick solo puede contener letras, números y guiones bajos',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nick: normalizedNick })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'Este nick ya está en uso',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Error',
            description: 'No se pudo actualizar el perfil',
            variant: 'destructive'
          });
        }
        return;
      }

      await refreshProfile();
      toast({
        title: 'Perfil actualizado',
        description: 'Tu perfil se ha actualizado correctamente'
      });
      onBack();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({
        title: 'Error',
        description: 'Error al actualizar el perfil',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

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
          <h1 className="text-xl font-gaming font-bold">Editar perfil</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center">
          <ProfilePhoto
            url={profile?.profile_photo_url || profile?.avatar_snapshot_url}
            nick={profile?.nick || ''}
            size="xl"
            showBorder={true}
            className="w-32 h-32"
            onClick={() => setShowPhotoEditor(true)}
            editable={true}
          />
          <button
            onClick={() => setShowPhotoEditor(true)}
            className="mt-2 text-primary text-sm font-medium"
          >
            Cambiar foto
          </button>
        </div>

        <ProfilePhotoEditor
          isOpen={showPhotoEditor}
          onClose={() => setShowPhotoEditor(false)}
          currentPhotoUrl={profile?.profile_photo_url || profile?.avatar_snapshot_url}
          onPhotoUpdated={refreshProfile}
        />

        {/* Nick */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Nick</label>
          <Input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Tu nick"
            className="ml-0"
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            Solo letras, números y guiones bajos. 3-20 caracteres.
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || nick.trim() === profile?.nick}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar cambios'
          )}
        </Button>
      </div>
    </div>
  );
}
