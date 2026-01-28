import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAvatar, AvatarConfig } from "@/hooks/useAvatar";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";
import { toast } from "sonner";

export default function EditAvatarPage() {
  const navigate = useNavigate();
  const { generateAvatar, isGenerating, currentConfig } = useAvatar();

  const handleSave = async (config: AvatarConfig) => {
    const result = await generateAvatar(config);
    
    if (result.success) {
      toast.success("¡Avatar actualizado!");
      navigate("/app/profile");
    } else {
      toast.error(result.error || "Error actualizando avatar");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-card"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-xl font-gaming font-bold">Editar Avatar</h1>
        </div>
      </header>

      <div className="p-4 pb-8">
        <AvatarEditor
          initialConfig={currentConfig}
          onSave={handleSave}
          isSaving={isGenerating}
          saveButtonText="Guardar Cambios"
          showProgress={false}
        />
      </div>
    </div>
  );
}
