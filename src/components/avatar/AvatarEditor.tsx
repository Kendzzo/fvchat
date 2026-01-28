import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvatarPreview, { AvatarConfig, DEFAULT_AVATAR_CONFIG } from "./AvatarPreview";

interface AvatarEditorProps {
  initialConfig?: AvatarConfig;
  onSave: (config: AvatarConfig) => Promise<void>;
  isSaving?: boolean;
}

type CategoryKey = "skinTone" | "hairStyle" | "hairColor" | "eyeColor" | "outfit" | "outfitColor" | "accessory";

interface CategoryOption {
  key: CategoryKey;
  label: string;
  options: { value: string; label: string; color?: string }[];
}

const categories: CategoryOption[] = [
  {
    key: "skinTone",
    label: "Tono de piel",
    options: [
      { value: "#FFDFC4", label: "Claro", color: "#FFDFC4" },
      { value: "#FFD5B4", label: "Medio claro", color: "#FFD5B4" },
      { value: "#E8B98A", label: "Medio", color: "#E8B98A" },
      { value: "#C68642", label: "Bronceado", color: "#C68642" },
      { value: "#8D5524", label: "Moreno", color: "#8D5524" },
      { value: "#5C3A21", label: "Oscuro", color: "#5C3A21" },
    ],
  },
  {
    key: "hairStyle",
    label: "Peinado",
    options: [
      { value: "short", label: "Corto" },
      { value: "long", label: "Largo" },
      { value: "curly", label: "Rizado" },
      { value: "spiky", label: "Puntas" },
      { value: "ponytail", label: "Coleta" },
      { value: "buzz", label: "Rapado" },
    ],
  },
  {
    key: "hairColor",
    label: "Color de pelo",
    options: [
      { value: "#1C1C1C", label: "Negro", color: "#1C1C1C" },
      { value: "#4A3728", label: "Castaño", color: "#4A3728" },
      { value: "#8B4513", label: "Marrón", color: "#8B4513" },
      { value: "#FFD700", label: "Rubio", color: "#FFD700" },
      { value: "#FF6B35", label: "Pelirrojo", color: "#FF6B35" },
      { value: "#FF69B4", label: "Rosa", color: "#FF69B4" },
      { value: "#6366F1", label: "Azul", color: "#6366F1" },
      { value: "#10B981", label: "Verde", color: "#10B981" },
    ],
  },
  {
    key: "eyeColor",
    label: "Color de ojos",
    options: [
      { value: "#4A90D9", label: "Azul", color: "#4A90D9" },
      { value: "#10B981", label: "Verde", color: "#10B981" },
      { value: "#8B4513", label: "Marrón", color: "#8B4513" },
      { value: "#1C1C1C", label: "Negro", color: "#1C1C1C" },
      { value: "#9333EA", label: "Violeta", color: "#9333EA" },
      { value: "#F59E0B", label: "Ámbar", color: "#F59E0B" },
    ],
  },
  {
    key: "outfit",
    label: "Ropa",
    options: [
      { value: "hoodie", label: "Sudadera" },
      { value: "tshirt", label: "Camiseta" },
      { value: "jacket", label: "Chaqueta" },
      { value: "dress", label: "Vestido" },
      { value: "sporty", label: "Deportivo" },
    ],
  },
  {
    key: "outfitColor",
    label: "Color de ropa",
    options: [
      { value: "#6366F1", label: "Índigo", color: "#6366F1" },
      { value: "#EF4444", label: "Rojo", color: "#EF4444" },
      { value: "#10B981", label: "Verde", color: "#10B981" },
      { value: "#F59E0B", label: "Naranja", color: "#F59E0B" },
      { value: "#EC4899", label: "Rosa", color: "#EC4899" },
      { value: "#1F2937", label: "Negro", color: "#1F2937" },
      { value: "#FFFFFF", label: "Blanco", color: "#FFFFFF" },
    ],
  },
  {
    key: "accessory",
    label: "Accesorio",
    options: [
      { value: "none", label: "Ninguno" },
      { value: "glasses", label: "Gafas" },
      { value: "sunglasses", label: "Gafas de sol" },
      { value: "headphones", label: "Auriculares" },
      { value: "cap", label: "Gorra" },
      { value: "earrings", label: "Pendientes" },
    ],
  },
];

export default function AvatarEditor({ initialConfig, onSave, isSaving = false }: AvatarEditorProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig || DEFAULT_AVATAR_CONFIG);
  const [categoryIndex, setCategoryIndex] = useState(0);

  const currentCategory = categories[categoryIndex];

  const updateConfig = useCallback((key: CategoryKey, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const nextCategory = () => {
    setCategoryIndex((prev) => (prev + 1) % categories.length);
  };

  const prevCategory = () => {
    setCategoryIndex((prev) => (prev - 1 + categories.length) % categories.length);
  };

  const handleSave = async () => {
    await onSave(config);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview */}
      <div className="flex-shrink-0 flex justify-center items-center py-6 bg-gradient-to-b from-primary/10 to-transparent">
        <motion.div
          key={JSON.stringify(config)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <AvatarPreview config={config} size="xl" />
        </motion.div>
      </div>

      {/* Category Navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-card/50 backdrop-blur-sm border-y border-border/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevCategory}
          className="rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-gaming text-lg font-semibold">{currentCategory.label}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextCategory}
          className="rounded-full"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Category dots */}
      <div className="flex justify-center gap-1.5 py-2">
        {categories.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCategoryIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === categoryIndex ? "bg-primary w-4" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Options Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {currentCategory.options.map((option) => {
            const isSelected = config[currentCategory.key] === option.value;
            const hasColor = !!option.color;

            return (
              <motion.button
                key={option.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => updateConfig(currentCategory.key, option.value)}
                className={`
                  relative p-3 rounded-xl border-2 transition-all
                  ${isSelected 
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" 
                    : "border-border/50 bg-card/50 hover:border-primary/50"
                  }
                `}
              >
                {hasColor ? (
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-2 border-2 border-white/20 shadow-inner"
                    style={{ backgroundColor: option.color }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full mx-auto mb-2 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-lg">✨</span>
                  </div>
                )}
                <span className="text-xs font-medium text-center block truncate">
                  {option.label}
                </span>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex-shrink-0 p-4 bg-card/50 backdrop-blur-sm border-t border-border/30">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-12 text-lg font-gaming"
          size="lg"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Guardar Avatar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
