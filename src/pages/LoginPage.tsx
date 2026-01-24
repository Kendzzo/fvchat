import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import vfcLogo from "@/assets/vfc-logo.png";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nick || !password) {
      setError("Por favor, completa todos los campos");
      return;
    }

    setIsLoading(true);
    
    try {
      const { error: signInError } = await signIn(nick, password);
      
      if (signInError) {
        setError(signInError.message);
      } else {
        navigate("/app");
      }
    } catch (err) {
      setError("Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/")}
          className="p-2 rounded-xl bg-card/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo */}
        <motion.img
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          src={vfcLogo}
          alt="VFC"
          className="w-32 h-32 object-contain mb-6"
        />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-gaming font-bold gradient-text mb-2">
            ¡Hola de nuevo!
          </h1>
          <p className="text-muted-foreground">
            Inicia sesión para continuar
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4"
        >
          {error && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Tu nick
            </label>
            <input
              type="text"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="@tunick"
              className="input-gaming w-full"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-gaming w-full pr-12"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="text-sm text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <motion.button
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            type="submit"
            disabled={isLoading}
            className="btn-gaming w-full py-4 rounded-2xl text-foreground font-gaming text-lg mt-6 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </motion.button>

          {/* Dev hint */}
          <p className="text-xs text-muted-foreground text-center mt-2">
            Desarrollo: Admin / 1234
          </p>
        </motion.form>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-muted-foreground text-sm">
            ¿No tienes cuenta?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-secondary font-semibold hover:underline"
            >
              Regístrate
            </button>
          </p>
        </motion.div>

        {/* Safe indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Shield className="w-4 h-4 text-secondary" />
          Conexión segura y protegida
        </motion.div>
      </div>
    </div>
  );
}
