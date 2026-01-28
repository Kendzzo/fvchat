import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  Lock,
  Check,
  Palette,
  User,
  Eye,
  Shirt,
  Footprints,
  Glasses,
  Smile,
  Move,
  Trophy
} from "lucide-react";
import { useAvatar, AvatarConfig, AvatarItem } from "@/hooks/useAvatar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  skin: User,
  face: Smile,
  eyes: Eye,
  hair: Palette,
  top: Shirt,
  bottom: Shirt,
  shoes: Footprints,
  accessory: Glasses,
  expression: Smile,
  pose: Move,
};

const CATEGORY_LABELS: Record<string, string> = {
  skin: 'Piel',
  face: 'Cara',
  eyes: 'Ojos',
  hair: 'Pelo',
  top: 'Camiseta',
  bottom: 'Pantalón',
  shoes: 'Zapatos',
  accessory: 'Accesorio',
  expression: 'Expresión',
  pose: 'Pose',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
};

export default function EditAvatarPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { 
    avatarUrl, 
    currentConfig,
    generateAvatar, 
    isGenerating,
    avatarItems,
    isLoadingItems,
    ownsItem,
    getItemsByCategory,
  } = useAvatar();
  
  const [config, setConfig] = useState<AvatarConfig>(currentConfig);
  const [selectedCategory, setSelectedCategory] = useState<string>('hair');
  const [hasChanges, setHasChanges] = useState(false);

  const categories = ['skin', 'face', 'eyes', 'hair', 'top', 'bottom', 'shoes', 'accessory', 'expression', 'pose'];

  const handleSelectItem = (item: AvatarItem, field: string, value: string) => {
    if (!item.is_default && !ownsItem(item.id)) {
      toast.error("¡Desbloquéalo participando en desafíos!");
      return;
    }

    setConfig(prev => ({
      ...prev,
      [selectedCategory]: {
        ...(prev[selectedCategory as keyof AvatarConfig] as Record<string, string>),
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const result = await generateAvatar(config);
    
    if (result.success) {
      toast.success("¡Avatar actualizado!");
      setHasChanges(false);
    } else {
      toast.error(result.error || "Error actualizando avatar");
    }
  };

  const renderItemGrid = () => {
    const items = getItemsByCategory(selectedCategory);
    
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay items disponibles</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const isOwned = item.is_default || ownsItem(item.id);
          const assetData = item.asset_data as Record<string, unknown>;
          
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const field = Object.keys(assetData)[0];
                const value = assetData[field] as string;
                if (typeof value === 'string') {
                  handleSelectItem(item, field, value);
                }
              }}
              disabled={!isOwned}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                isOwned 
                  ? 'bg-card hover:border-primary' 
                  : 'bg-card/50 opacity-60'
              }`}
            >
              {/* Rarity indicator */}
              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${RARITY_COLORS[item.rarity]}`} />
              
              {/* Lock icon for unowned */}
              {!isOwned && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              )}

              <div className="text-3xl mb-2">
                {selectedCategory === 'expression' ? 
                  (assetData.expression === 'happy' ? '😊' : 
                   assetData.expression === 'surprised' ? '😮' : 
                   assetData.expression === 'angry' ? '😠' : '😐') :
                  selectedCategory === 'pose' ?
                  (assetData.pose === 'victory' ? '✌️' : 
                   assetData.pose === 'cool' ? '😎' : '🧍') :
                  '✨'
                }
              </div>
              <p className="text-sm font-medium truncate">{item.name}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {RARITY_LABELS[item.rarity]}
              </Badge>
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
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

      <div className="p-4 space-y-6 pb-32">
        {/* Current Avatar Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative aspect-square max-w-[200px] mx-auto bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-3xl border border-border/50 overflow-hidden"
        >
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Tu avatar" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              🎮
            </div>
          )}
          
          {hasChanges && (
            <div className="absolute bottom-2 left-2 right-2">
              <Badge className="w-full justify-center bg-warning text-warning-foreground">
                Cambios sin guardar
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Category Selector */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 min-w-max pb-2">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              const isActive = selectedCategory === cat;
              
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                      : 'bg-card text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inventory Section */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              {(() => {
                const Icon = CATEGORY_ICONS[selectedCategory];
                return <Icon className="w-5 h-5" />;
              })()}
              {CATEGORY_LABELS[selectedCategory]}
            </h2>
            <Badge variant="outline" className="text-xs">
              <Trophy className="w-3 h-3 mr-1" />
              {getItemsByCategory(selectedCategory).filter(i => i.is_default || ownsItem(i.id)).length} / {getItemsByCategory(selectedCategory).length}
            </Badge>
          </div>

          {isLoadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            renderItemGrid()
          )}
        </div>

        {/* Unlock hint */}
        <div className="text-center text-sm text-muted-foreground">
          <Lock className="w-4 h-4 inline mr-1" />
          Desbloquea más items participando en desafíos diarios
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/30">
          <Button 
            onClick={handleSave}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-success to-primary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Regenerando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Guardar Avatar
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
