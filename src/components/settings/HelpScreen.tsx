import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, Mail, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Props {
  onBack: () => void;
}

const faqs = [
  {
    question: '¿Cómo puedo cambiar mi foto de perfil?',
    answer: 'Ve a Ajustes > Editar perfil y pulsa sobre tu foto actual para cambiarla. Puedes hacer una foto nueva o elegir una de tu galería.'
  },
  {
    question: '¿Por qué mi cuenta está pendiente de aprobación?',
    answer: 'Tu tutor legal debe aprobar tu cuenta antes de que puedas chatear y añadir amigos. Hemos enviado un email a tu tutor con un enlace de aprobación.'
  },
  {
    question: '¿Cómo añado amigos?',
    answer: 'Ve a tu Perfil y pulsa "Añadir amigos". Puedes buscar usuarios por su nick y enviarles una solicitud de amistad.'
  },
  {
    question: '¿Qué son los desafíos diarios?',
    answer: 'Son retos creativos que cambian cada día. Participa subiendo fotos o vídeos relacionados con el tema del día para ganar recompensas.'
  },
  {
    question: '¿Cómo reporto contenido inapropiado?',
    answer: 'Pulsa los tres puntos en cualquier publicación o mensaje y selecciona "Reportar". Nuestro equipo revisará el contenido.'
  },
  {
    question: '¿Puedo bloquear a otros usuarios?',
    answer: 'Sí, puedes bloquear usuarios desde su perfil o desde los tres puntos de sus publicaciones. Los usuarios bloqueados no podrán contactarte ni ver tu contenido.'
  }
];

export function HelpScreen({ onBack }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleContactSupport = () => {
    // Open mailto link
    window.location.href = 'mailto:soporte@vfc.app?subject=Ayuda%20VFC%20Kids%20Connect';
    toast({
      title: 'Abriendo correo',
      description: 'Se abrirá tu aplicación de correo para contactar con soporte'
    });
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
          <h1 className="text-xl font-gaming font-bold">Ayuda y soporte</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* FAQ Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Preguntas frecuentes</h2>
          </div>
          
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Collapsible
                  open={openFaq === i}
                  onOpenChange={(open) => setOpenFaq(open ? i : null)}
                >
                  <CollapsibleTrigger className="w-full glass-card p-4 flex items-center gap-4">
                    <MessageSquare className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">{faq.question}</span>
                    {openFaq === i ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 pt-2">
                    <p className="text-sm text-muted-foreground pl-9">
                      {faq.answer}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContactSupport}
          className="w-full glass-card p-4 flex items-center gap-4 bg-gradient-to-r from-primary/10 to-secondary/10"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Contactar soporte</p>
            <p className="text-sm text-muted-foreground">¿No encuentras respuesta? Escríbenos</p>
          </div>
        </motion.button>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            Tiempo de respuesta: 24-48 horas
          </p>
        </div>
      </div>
    </div>
  );
}
