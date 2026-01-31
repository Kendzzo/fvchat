import { Shield } from "lucide-react";

interface ReadOnlyBannerProps {
  className?: string;
}

export function ReadOnlyBanner({ className = "" }: ReadOnlyBannerProps) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 ${className}`}>
      <Shield className="w-5 h-5 text-warning flex-shrink-0" />
      <p className="text-sm text-warning">
        🛡️ Tu cuenta está pendiente de aprobación del tutor
      </p>
    </div>
  );
}

// Constant message for blocking interactions
export const READ_ONLY_MESSAGE = "🔒 Esta función se desbloquea cuando tu tutor apruebe tu cuenta.";
