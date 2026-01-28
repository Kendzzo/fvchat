import { useNavigate } from "react-router-dom";
import { useAvatar, AvatarConfig } from "@/hooks/useAvatar";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";
import { toast } from "sonner";

export default function CreateAvatarPage() {
  const navigate = useNavigate();
  const { generateAvatar, isGenerating, DEFAULT_AVATAR_CONFIG } = useAvatar();

  const handleSave = async (config: AvatarConfig) => {
    const result = await generateAvatar(config);
    
    if (result.success) {
      toast.success("¡Avatar creado con éxito!");
      navigate("/app");
    } else {
      toast.error(result.error || "Error creando avatar");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-gaming font-bold gradient-text">Crea tu Avatar</h1>
          <div className="text-sm text-muted-foreground">
            ¡Personalízalo a tu gusto!
          </div>
        </div>
      </header>

      <div className="p-4 pb-8">
        <AvatarEditor
          initialConfig={DEFAULT_AVATAR_CONFIG}
          onSave={handleSave}
          isSaving={isGenerating}
          saveButtonText="¡Crear Avatar!"
          showProgress={true}
        />
      </div>
    </div>
  );
}
