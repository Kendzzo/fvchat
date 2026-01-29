import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  onBack: () => void;
}

export function SecurityScreen({ onBack }: Props) {
  const { profile, signOut } = useAuth();
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutAllDevices = async () => {
    setIsLoggingOut(true);
    try {
      // Sign out from all devices by signing out globally
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo cerrar sesión en todos los dispositivos',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Sesión cerrada',
        description: 'Se ha cerrado sesión en todos los dispositivos'
      });
      
      // The onAuthStateChange will handle the redirect
    } catch (err) {
      console.error('Error logging out all devices:', err);
      toast({
        title: 'Error',
        description: 'Error al cerrar sesión',
        variant: 'destructive'
      });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutAllDialog(false);
    }
  };

  // Use updated_at as fallback if last_seen_at not in Profile type
  const lastSeenDate = (profile as { last_seen_at?: string | null })?.last_seen_at || profile?.updated_at;
  const lastSeen = lastSeenDate 
    ? format(new Date(lastSeenDate), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })
    : 'No disponible';

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
          <h1 className="text-xl font-gaming font-bold">Seguridad</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Last Login */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Última actividad</p>
            <p className="font-medium">{lastSeen}</p>
          </div>
        </motion.div>

        {/* Logout All Devices */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowLogoutAllDialog(true)}
          className="w-full glass-card p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-destructive">Cerrar sesión en todos los dispositivos</p>
            <p className="text-sm text-muted-foreground">Cierra sesión en todos los dispositivos conectados</p>
          </div>
        </motion.button>
      </div>

      {/* Logout All Dialog */}
      <AlertDialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              ¿Cerrar sesión en todos los dispositivos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cerrará tu sesión en todos los dispositivos donde hayas iniciado sesión, incluyendo este.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutAllDevices}
              disabled={isLoggingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cerrando...
                </>
              ) : (
                'Cerrar todas las sesiones'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
