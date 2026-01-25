import { Clock, Shield, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ParentalGateProps {
  tutorEmail?: string;
  feature?: string;
}

export function ParentalGate({ tutorEmail, feature = 'esta función' }: ParentalGateProps) {
  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-warning" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Pendiente de Aprobación</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Para usar {feature}, tu tutor debe aprobar tu cuenta.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
            <Clock className="w-4 h-4" />
            <span>Esperando aprobación</span>
          </div>

          {tutorEmail && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span>Email tutor: {tutorEmail}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Se ha enviado un email a tu tutor para autorizar tu cuenta.
            <br />
            <span className="text-warning">(En desarrollo: el admin puede aprobar manualmente)</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
