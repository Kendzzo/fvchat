import { useState } from 'react';
import { Shield, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LegalGateProps {
  isOpen: boolean;
  onAccepted: () => void;
  userId: string;
  onViewFullText?: () => void;
}

const LEGAL_VERSION = "2026-01-31";

export function LegalGate({ isOpen, onAccepted, userId, onViewFullText }: LegalGateProps) {
  const [accepted, setAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      toast({
        title: 'Obligatorio',
        description: 'Debes aceptar las normas para continuar',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          legal_accepted: true,
          legal_accepted_at: new Date().toISOString(),
          legal_version: LEGAL_VERSION
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Guardado',
        description: 'Has aceptado las normas de privacidad y seguridad'
      });
      
      onAccepted();
    } catch (err) {
      console.error('[LegalGate] Error:', err);
      toast({
        title: 'Error',
        description: 'No se pudo guardar. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-4 [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Privacidad, Normas y Seguridad
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Para usar el chat y otras funciones sociales de Versus, es necesario que el 
              padre/madre/tutor legal acepte las normas de privacidad y seguridad.
            </p>
            
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <p className="font-medium text-warning mb-2">⚠️ Importante</p>
              <p className="text-xs">
                Al aceptar, reconoces que la IA y los filtros de moderación pueden fallar 
                y que asumes la responsabilidad total de supervisar el uso por parte del menor.
              </p>
            </div>

            {onViewFullText && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onViewFullText}
                className="w-full gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Ver texto legal completo
              </Button>
            )}
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-start gap-3">
            <Checkbox 
              id="legal-gate-accept"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-1"
            />
            <label htmlFor="legal-gate-accept" className="text-xs text-foreground cursor-pointer leading-relaxed">
              Declaro que soy el padre/madre/tutor legal. Acepto estas Normas, Privacidad y Seguridad. 
              Entiendo que la IA y los filtros pueden fallar y asumo la supervisión y responsabilidad 
              total del uso por parte del menor.
            </label>
          </div>

          <Button 
            onClick={handleAccept}
            disabled={!accepted || isSaving}
            className="w-full bg-gradient-to-r from-primary to-secondary"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Aceptar y continuar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
