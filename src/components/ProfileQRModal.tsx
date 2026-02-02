import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";

interface ProfileQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  nick: string;
}

export function ProfileQRModal({ isOpen, onClose, userId, nick }: ProfileQRModalProps) {
  // Construir la URL del perfil público
  const profileUrl = `${window.location.origin}/u/${userId}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-gaming text-foreground">
            Mi código QR
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-2xl shadow-lg border border-border/30">
            <QRCodeSVG
              value={profileUrl}
              size={200}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#1b0637"
            />
          </div>
          
          {/* Nick del usuario */}
          <p className="text-lg font-medium text-muted-foreground">
            @{nick}
          </p>
          
          {/* Instrucciones */}
          <p className="text-sm text-muted-foreground text-center px-4">
            Escanea este código para encontrar mi perfil
          </p>
          
          {/* Botón cerrar */}
          <Button
            onClick={onClose}
            className="w-full max-w-[200px] bg-gradient-to-r from-primary to-secondary text-white rounded-xl"
          >
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
