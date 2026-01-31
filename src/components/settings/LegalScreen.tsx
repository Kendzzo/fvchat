import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  onBack: () => void;
}

const LEGAL_VERSION = "2026-01-31";

const LEGAL_CONTENT = `
# PRIVACIDAD, NORMAS Y SEGURIDAD — VERSUS (MVP/BETA PRIVADA)

**Última actualización: 31/01/2026**

---

## 1) Identificación del Operador (MVP/Beta privada)

Versus (la "Plataforma") es un proyecto en fase MVP/Beta privada (family & friends), no abierto a comercialización general en esta etapa.

- **Operador/Responsable:** Raúl Oya Cornejo
- **Contacto (Privacidad/Soporte/Seguridad):** r.oyacornejo@gmail.com

El Operador podrá actualizar estos datos si la Plataforma pasa a una fase pública o comercial.

---

## 2) Finalidad de Versus y alcance del servicio

Versus tiene como finalidad permitir la conexión y comunicación entre menores en un entorno más controlado que las redes sociales abiertas, con normas estrictas, herramientas de seguridad y opciones de control parental.

**Advertencia esencial:** la Plataforma aporta medidas técnicas de reducción de riesgo, pero no puede garantizar un riesgo cero ni sustituye la supervisión y educación digital del menor por parte de su padre/madre/tutor.

---

## 3) Condiciones de uso para menores (responsabilidad parental absoluta)

Al permitir el acceso de un menor, el padre/madre/tutor legal (el "Representante Legal") declara y acepta de forma expresa que:

1. Tiene la patria potestad/tutela o representación legal del menor.
2. Autoriza el uso de Versus por el menor y el tratamiento de sus datos conforme a este texto.
3. Asume la supervisión activa, continua y efectiva del uso (tiempo, contactos, conversaciones, conducta y límites).
4. Es el único y último responsable de la actividad del menor dentro y fuera de la Plataforma, incluyendo el uso indebido, negligente o contrario a las normas.

---

## 4) Normas del Chat y Conductas Prohibidas (tolerancia cero)

Queda estrictamente prohibido, sin excepción:

- **Compartir datos personales o sensibles:** dirección, teléfono, ubicación precisa, centro escolar, contraseñas, documentos, información financiera o cualquier dato identificativo de riesgo.
- **Acoso, amenazas, insultos, discriminación, extorsión, coacción, "grooming"** o cualquier conducta predatoria.
- **Contenido sexual, violencia explícita, autolesiones** o promoción de conductas peligrosas.
- **Enlaces maliciosos, malware, suplantación de identidad** o ingeniería social.
- **Captación del menor a redes abiertas,** plataformas externas o contactos fuera del control parental.
- **Cualquier actividad ilegal** o que ponga en riesgo a un menor o a terceros.

**Medidas:** la Plataforma podrá filtrar, limitar, eliminar contenido, bloquear contactos, suspender o cerrar cuentas por seguridad o por indicios de incumplimiento, sin obligación de preaviso ni indemnización, en la máxima medida permitida por la ley.

---

## 5) Seguridad, Moderación e IA (límites tecnológicos)

Versus puede usar medidas automatizadas, incluyendo herramientas basadas en IA, para apoyo a seguridad (detección de lenguaje o conductas de riesgo, filtros, alertas, etc.).

El Representante Legal reconoce y acepta que:

- la IA y los filtros **no son infalibles** (pueden fallar o no detectar riesgos),
- pueden existir **falsos positivos/negativos**,
- la tecnología **no sustituye criterio humano** ni supervisión parental,
- en consecuencia, la **supervisión del Representante Legal es obligatoria** y prevalece siempre.

---

## 6) Política de Privacidad (RGPD/LOPDGDD) — resumen operativo

**Responsable del tratamiento:** Raúl Oya Cornejo (contacto: r.oyacornejo@gmail.com).

**Datos que pueden tratarse (según uso):**
- **Del menor:** alias/nick, ID interno, edad o rango de edad, avatar (si se usa), actividad y configuración, reportes/bloqueos, contenido y metadatos del chat (fecha/hora/interlocución), datos técnicos (IP, identificadores y logs).
- **Del Representante Legal:** email de contacto, evidencias de consentimiento/aceptación y ajustes de control parental.

**Finalidades principales:**
- crear y mantener cuentas, operar el chat y funcionalidades,
- seguridad, prevención de abuso, moderación y soporte,
- mejora del servicio y diagnóstico de errores.

**Base jurídica:**
- ejecución del servicio (art. 6.1.b RGPD),
- consentimiento cuando proceda, especialmente para menores (art. 6.1.a RGPD),
- interés legítimo en seguridad e integridad del servicio (art. 6.1.f RGPD),
- obligación legal cuando aplique (art. 6.1.c RGPD).

**Conservación:** durante el tiempo necesario para operar la cuenta y seguridad; y posteriormente, solo lo imprescindible para gestionar incidencias, cumplimiento y responsabilidades legales, en la mínima medida posible.

**Destinatarios:** proveedores técnicos indispensables (alojamiento, infraestructura, soporte y, si aplica, seguridad/moderación) como encargados de tratamiento; y autoridades cuando exista obligación o requerimiento.

**Derechos:** acceso, rectificación, supresión, oposición, limitación y portabilidad solicitando en r.oyacornejo@gmail.com (acreditando representación legal cuando proceda). También cabe reclamación ante la AEPD.

---

## 7) Descargo de responsabilidad y exoneración (blindaje máximo)

En la máxima medida permitida por la ley, el Operador:

1. **No garantiza** la disponibilidad continua del servicio ni ausencia de errores, interrupciones, pérdidas de datos, fallos técnicos, vulnerabilidades o incidencias propias de una fase MVP/Beta.
2. **No es responsable** de la conducta de Usuarios (menores o terceros), ni de daños derivados de interacciones, conversaciones, contenidos compartidos, enlaces, archivos o decisiones tomadas por los Usuarios.
3. **No asume responsabilidad** por daños indirectos, incidentales, punitivos, pérdida de oportunidad, reputación, lucro cesante o consecuencias derivadas del uso o imposibilidad de uso.
4. **No responde** de la eficacia total de filtros/IA/moderación, ni de la ausencia de falsos positivos/negativos o de riesgos no detectados.
5. El Representante Legal acepta que el Operador actúa como proveedor de una herramienta técnica y que la **responsabilidad última y total de supervisión y control recae en el Representante Legal**.

**Indemnidad (mantener indemne):** el Representante Legal se obliga, en la máxima medida permitida por la ley, a mantener indemne al Operador frente a reclamaciones, daños, sanciones, costes y gastos (incluidos honorarios legales) que se deriven de:
- uso indebido por el menor o por el propio Representante Legal,
- incumplimiento de estas normas,
- negligencia en custodia de credenciales,
- contenidos o conductas ilícitas o perjudiciales generadas o difundidas por el menor/Representante Legal.

---

## 8) Canal único de reporte y contacto

Para cualquier incidencia de seguridad, reporte o ejercicio de derechos de privacidad:

📧 **r.oyacornejo@gmail.com**

---

*Fin del texto.*
`;

export function LegalScreen({ onBack }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if already accepted
  const isAlreadyAccepted = (profile as any)?.legal_accepted === true;
  const acceptedVersion = (profile as any)?.legal_version;
  const acceptedAt = (profile as any)?.legal_accepted_at;

  useEffect(() => {
    if (isAlreadyAccepted) {
      setAccepted(true);
    }
  }, [isAlreadyAccepted]);

  const handleSave = async () => {
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
        .eq('id', profile?.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: 'Guardado',
        description: 'Has aceptado las normas de privacidad y seguridad'
      });
      
      onBack();
    } catch (err) {
      console.error('[Legal] Error saving:', err);
      toast({
        title: 'Error',
        description: 'No se pudo guardar. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Simple markdown-like renderer
  const renderContent = (content: string) => {
    const lines = content.trim().split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-xl font-bold text-foreground mt-6 mb-4">
            {trimmed.slice(2)}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-lg font-semibold text-foreground mt-5 mb-3">
            {trimmed.slice(3)}
          </h2>
        );
      } else if (trimmed.startsWith('---')) {
        elements.push(<hr key={i} className="my-4 border-border/50" />);
      } else if (trimmed.startsWith('- ')) {
        elements.push(
          <li key={i} className="text-sm text-muted-foreground ml-4 mb-1">
            {renderInlineFormatting(trimmed.slice(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={i} className="text-sm text-muted-foreground ml-4 mb-1 list-decimal">
            {renderInlineFormatting(trimmed.replace(/^\d+\.\s/, ''))}
          </li>
        );
      } else if (trimmed === '') {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(
          <p key={i} className="text-sm text-muted-foreground mb-2">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      }
    });
    
    return elements;
  };

  const renderInlineFormatting = (text: string) => {
    // Handle **bold** and *italic*
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 rounded-xl bg-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-lg font-gaming font-bold">Privacidad, Normas y Seguridad</h1>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Status Badge if already accepted */}
          {isAlreadyAccepted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-success/20 border border-success/30 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-success" />
              <div>
                <p className="text-sm font-medium text-success">Aceptado</p>
                <p className="text-xs text-muted-foreground">
                  Versión {acceptedVersion} • {acceptedAt ? new Date(acceptedAt).toLocaleDateString('es-ES') : ''}
                </p>
              </div>
            </motion.div>
          )}

          {/* Legal Content */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-xs text-muted-foreground">Versión: {LEGAL_VERSION}</span>
            </div>
            
            <div className="prose prose-sm max-w-none">
              {renderContent(LEGAL_CONTENT)}
            </div>
          </div>

          {/* Acceptance Checkbox */}
          {!isAlreadyAccepted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 mb-6"
            >
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="legal-accept"
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked === true)}
                  className="mt-1"
                />
                <label htmlFor="legal-accept" className="text-sm text-foreground cursor-pointer leading-relaxed">
                  Declaro que soy el padre/madre/tutor legal. Acepto estas Normas, Privacidad y Seguridad. 
                  Entiendo que la IA y los filtros pueden fallar y asumo la supervisión y responsabilidad 
                  total del uso por parte del menor.
                </label>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Save Button */}
      {!isAlreadyAccepted && (
        <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/30 safe-area-inset-bottom">
          <Button 
            onClick={handleSave}
            disabled={!accepted || isSaving}
            className="w-full bg-gradient-to-r from-primary to-secondary"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Aceptar y guardar'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
