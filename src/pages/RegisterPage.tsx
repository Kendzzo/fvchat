import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Check, AlertCircle, Shield, Mail, Loader2 } from "lucide-react";
import vfcLogo from "@/assets/vfc-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const currentYear = new Date().getFullYear();
const validYears = Array.from({ length: 11 }, (_, i) => currentYear - 16 + i); // 2010-2020

// Lista de palabras no permitidas en nicks
const bannedWords = ["tonto", "idiota", "estupido", "malo"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [nick, setNick] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [tutorEmail, setTutorEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [nickError, setNickError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateNick = (value: string) => {
    // No números
    if (/\d/.test(value)) {
      setNickError("El nick no puede contener números");
      return false;
    }
    // No palabras malsonantes
    const lowerValue = value.toLowerCase();
    for (const word of bannedWords) {
      if (lowerValue.includes(word)) {
        setNickError("El nick contiene palabras no permitidas");
        return false;
      }
    }
    // Mínimo 3 caracteres
    if (value.length < 3) {
      setNickError("El nick debe tener al menos 3 caracteres");
      return false;
    }
    setNickError("");
    return true;
  };

  const handleNickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, "");
    setNick(value);
    if (value.length > 0) {
      validateNick(value);
    } else {
      setNickError("");
    }
  };

  const validateAge = (year: string) => {
    const age = currentYear - parseInt(year);
    if (age >= 17) {
      setError("Lo sentimos, esta app es solo para menores de 17 años");
      return false;
    }
    if (age < 6) {
      setError("Debes tener al menos 6 años para registrarte");
      return false;
    }
    setError("");
    return true;
  };

  const handleStep1 = () => {
    if (!nick || !validateNick(nick)) return;
    if (!birthYear || !validateAge(birthYear)) return;
    setStep(2);
  };

  const handleStep2 = () => {
    if (!tutorEmail) {
      setError("Por favor, introduce el email de tu tutor");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutorEmail)) {
      setError("El email no es válido");
      return;
    }
    setError("");
    setStep(3);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const { error: signUpError, userId } = await signUp(
        nick,
        password,
        parseInt(birthYear),
        tutorEmail
      );

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError("Este nick ya está registrado");
        } else {
          setError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      // Invoke backend functions using the userId returned by signUp
      if (userId) {
        console.log("[Register] User created, invoking backend functions for:", userId);
        
        // Send parent approval email - await to ensure it executes and log any errors
        try {
          const { data, error: fnError } = await supabase.functions.invoke("send-parent-approval-email", {
            body: { child_user_id: userId }
          });
          
          if (fnError) {
            console.error("[Register] Edge function error:", fnError);
            toast({
              title: "Aviso",
              description: "No se pudo notificar al tutor. Reintenta más tarde.",
            });
          } else {
            console.log("[Register] Parent approval email response:", data);
          }
        } catch (fnErr) {
          console.error("[Register] Failed to invoke edge function:", fnErr);
          toast({
            title: "Aviso",
            description: "No se pudo notificar al tutor. Reintenta más tarde.",
          });
        }

        // Assign starter stickers to new user
        try {
          console.log("[Register] Assigning starter stickers to user:", userId);
          const { data: stickerData, error: stickerError } = await supabase.functions.invoke("assign-starter-stickers", {
            body: { user_id: userId }
          });
          
          if (stickerError) {
            console.error("[Register] Sticker assignment error:", stickerError);
          } else {
            console.log("[Register] Stickers assigned:", stickerData);
          }
        } catch (stickerErr) {
          console.error("[Register] Failed to assign stickers:", stickerErr);
          // Don't block registration if sticker assignment fails
        }
      } else {
        console.warn("[Register] No userId returned after signUp - cannot invoke backend functions");
      }

      // Redirect to selfie onboarding
      navigate("/onboarding/selfie", { replace: true });
    } catch (err) {
      console.error("[Register] Registration error:", err);
      setError("Error al crear la cuenta");
    } finally {
      setIsLoading(false);
    }
  };

  const getAgeGroup = (year: string) => {
    const age = currentYear - parseInt(year);
    if (age >= 13) return "13-16 años";
    if (age >= 9) return "9-12 años";
    return "6-8 años";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => step > 1 && step < 4 ? setStep(step - 1) : navigate("/")}
          className="p-2 rounded-xl bg-card/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        
        {/* Progress */}
        <div className="flex-1 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                s <= step ? "bg-secondary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {step === 1 && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-8">
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                src={vfcLogo}
                alt="VFC"
                className="w-24 h-24 object-contain mx-auto mb-4"
              />
              <h1 className="text-2xl font-gaming font-bold gradient-text mb-2">
                ¡Crea tu cuenta!
              </h1>
              <p className="text-muted-foreground text-sm">
                Paso 1: Tu información básica
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Elige tu nick
                </label>
                <input
                  type="text"
                  value={nick}
                  onChange={handleNickChange}
                  placeholder="@tunick"
                  maxLength={20}
                  className={`input-gaming w-full ${nickError ? "border-destructive" : ""}`}
                />
                {nickError && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {nickError}
                  </p>
                )}
                {nick && !nickError && (
                  <p className="text-secondary text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Nick disponible
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Año de nacimiento
                </label>
                <select
                  value={birthYear}
                  onChange={(e) => {
                    setBirthYear(e.target.value);
                    validateAge(e.target.value);
                  }}
                  className="input-gaming w-full appearance-none cursor-pointer"
                >
                  <option value="">Selecciona tu año</option>
                  {validYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {birthYear && !error && (
                  <p className="text-secondary text-xs">
                    Grupo de edad: {getAgeGroup(birthYear)}
                  </p>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStep1}
                disabled={!nick || !birthYear || !!nickError || !!error}
                className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mx-auto mb-4 border-2 border-primary/30">
                <Shield className="w-10 h-10 text-secondary" />
              </div>
              <h1 className="text-2xl font-gaming font-bold gradient-text mb-2">
                Control parental
              </h1>
              <p className="text-muted-foreground text-sm">
                Paso 2: Necesitamos el email de tu tutor para tu seguridad
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30 text-sm">
                <p className="text-foreground font-medium mb-2">¿Por qué es necesario?</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• Tu tutor aprobará tu registro</li>
                  <li>• Aprobará las solicitudes de amistad</li>
                  <li>• Recibirá alertas si hay problemas</li>
                </ul>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); window.open('/legal-info', '_blank'); }}
                  className="text-xs text-primary underline mt-2 inline-block"
                >
                  Ver Privacidad, Normas y Seguridad
                </a>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Email del tutor/padre/madre
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={tutorEmail}
                    onChange={(e) => setTutorEmail(e.target.value)}
                    placeholder="tutor@email.com"
                    className="input-gaming w-full pl-12"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStep2}
                className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg"
              >
                Siguiente
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-gaming font-bold gradient-text mb-2">
                Crea tu contraseña
              </h1>
              <p className="text-muted-foreground text-sm">
                Paso 3: Elige una contraseña segura
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-gaming w-full"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="input-gaming w-full"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                type="submit"
                disabled={isLoading}
                className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* Step 4 removed - user is redirected to selfie onboarding */}
      </div>
    </div>
  );
}
