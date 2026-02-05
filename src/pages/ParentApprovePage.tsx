import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, AlertCircle, Loader2, Shield, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import vfcLogo from "@/assets/vfc-logo.png";

export default function ParentApprovePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [childNick, setChildNick] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const token = searchParams.get("token");
  const childId = searchParams.get("child");

  useEffect(() => {
    if (!token || !childId) {
      setStatus("error");
      setErrorMessage("Enlace inválido. Faltan parámetros.");
      return;
    }

    const approveChild = async () => {
      try {
        console.log("[ParentApprovePage] Calling parent-approve-child with:", { token: token?.slice(0, 10) + "...", child_user_id: childId });
        
        const { data, error } = await supabase.functions.invoke("parent-approve-child", {
          body: { token, child_user_id: childId }
        });

        console.log("[ParentApprovePage] Response:", { data, error });

        // Handle FunctionsHttpError (non-2xx status codes)
        if (error) {
          console.error("[ParentApprovePage] Function error:", error);
          
          // Try to extract error context from the error
          let errorContext = "";
          if (error.context) {
            try {
              const responseBody = await error.context.json();
              console.log("[ParentApprovePage] Error context body:", responseBody);
              errorContext = responseBody?.error || "";
            } catch {
              console.log("[ParentApprovePage] Could not parse error context");
            }
          }
          
          setStatus("error");
          
          // Parse error message for specific codes
          if (errorContext.includes("Invalid or expired token")) {
            setErrorMessage("El enlace no es válido o ha caducado. Solicita uno nuevo.");
          } else if (errorContext.includes("revoked")) {
            setErrorMessage("Este enlace ha sido revocado. Contacta con soporte.");
          } else if (errorContext.includes("mismatch")) {
            setErrorMessage("El enlace no corresponde a esta cuenta.");
          } else if (errorContext.includes("not found")) {
            setErrorMessage("No se encontró la cuenta del menor.");
          } else {
            setErrorMessage(errorContext || "Error técnico al conectar con el servidor.");
          }
          return;
        }

        // Success cases
        if (data?.ok) {
          setChildNick(data.child_nick || "");
          if (data.already_approved) {
            setStatus("already");
          } else {
            setStatus("success");
          }
          return;
        }

        // Fallback error
        setStatus("error");
        setErrorMessage(data?.error || "Error desconocido al aprobar.");
        
      } catch (err) {
        console.error("[ParentApprovePage] Exception:", err);
        setStatus("error");
        setErrorMessage("Error de conexión. Inténtalo de nuevo.");
      }
    };

    approveChild();
  }, [token, childId]);

  const handleGoToDashboard = () => {
    navigate(`/parent?token=${token}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm text-center"
        >
          <motion.img
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            src={vfcLogo}
            alt="VFC"
            className="w-20 h-20 object-contain mx-auto mb-6"
          />

          {status === "loading" && (
            <>
              <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-secondary animate-spin" />
              </div>
              <h1 className="text-xl font-gaming font-bold text-foreground mb-2">
                Aprobando registro...
              </h1>
              <p className="text-muted-foreground text-sm">
                Por favor espera un momento
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-10 h-10 text-green-500" />
              </motion.div>

              <h1 className="text-2xl font-gaming font-bold gradient-text mb-2">
                ¡Registro Aprobado!
              </h1>
              <p className="text-muted-foreground mb-6">
                La cuenta de <span className="text-secondary font-medium">@{childNick}</span> ha sido activada exitosamente.
              </p>

              <div className="p-4 rounded-xl bg-card border border-border/50 text-sm text-left space-y-2 mb-6">
                <p className="text-foreground font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-secondary" />
                  Tu hijo/a ya puede:
                </p>
                <ul className="text-muted-foreground space-y-1 pl-6 list-disc">
                  <li>Publicar fotos y vídeos</li>
                  <li>Chatear con amigos aprobados</li>
                  <li>Participar en desafíos</li>
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoToDashboard}
                className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg flex items-center justify-center gap-2"
              >
                Ir al Panel de Supervisión
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </>
          )}

          {status === "already" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-10 h-10 text-secondary" />
              </motion.div>

              <h1 className="text-2xl font-gaming font-bold gradient-text mb-2">
                Ya estaba aprobado
              </h1>
              <p className="text-muted-foreground mb-6">
                La cuenta de <span className="text-secondary font-medium">@{childNick}</span> ya estaba activa.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoToDashboard}
                className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg flex items-center justify-center gap-2"
              >
                Ir al Panel de Supervisión
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </>
          )}

          {status === "error" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6"
              >
                <AlertCircle className="w-10 h-10 text-destructive" />
              </motion.div>

              <h1 className="text-2xl font-gaming font-bold text-destructive mb-2">
                Acceso no válido
              </h1>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>

              <p className="text-xs text-muted-foreground">
                Si crees que es un error, contacta con soporte.
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
