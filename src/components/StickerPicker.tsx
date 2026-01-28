import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock } from 'lucide-react';
import { useStickers, Sticker } from '@/hooks/useStickers';
import { cn } from '@/lib/utils';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sticker: Sticker) => void;
  showOnlyOwned?: boolean;
}

const RARITY_COLORS = {
  common: 'border-muted-foreground/30',
  rare: 'border-blue-500 shadow-blue-500/20',
  epic: 'border-purple-500 shadow-purple-500/30 shadow-lg',
};

const RARITY_LABELS = {
  common: 'Común',
  rare: 'Raro',
  epic: 'Épico',
};

export function StickerPicker({ 
  isOpen, 
  onClose, 
  onSelect,
  showOnlyOwned = true 
}: StickerPickerProps) {
  const { catalog, ownsSticker, getOwnedStickers, isLoading } = useStickers();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const stickersToShow = showOnlyOwned ? getOwnedStickers() : catalog;
  
  // Get unique categories
  const categories = Array.from(new Set(stickersToShow.map(s => s.category)));

  // Filter by category
  const filteredStickers = selectedCategory
    ? stickersToShow.filter(s => s.category === selectedCategory)
    : stickersToShow;

  const handleSelect = (sticker: Sticker) => {
    if (!showOnlyOwned || ownsSticker(sticker.id)) {
      onSelect(sticker);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[70vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                <h3 className="font-gaming font-bold text-lg">Stickers</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories */}
            {categories.length > 1 && (
              <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-border/20">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    !selectedCategory
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Todos
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize",
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {/* Stickers Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredStickers.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {showOnlyOwned 
                      ? 'No tienes stickers aún. ¡Participa en desafíos para conseguirlos!'
                      : 'No hay stickers disponibles'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filteredStickers.map((sticker) => {
                    const owned = ownsSticker(sticker.id);
                    const canSelect = !showOnlyOwned || owned;

                    return (
                      <motion.button
                        key={sticker.id}
                        whileTap={canSelect ? { scale: 0.95 } : undefined}
                        onClick={() => handleSelect(sticker)}
                        disabled={!canSelect}
                        className={cn(
                          "relative aspect-square rounded-xl border-2 p-2 transition-all",
                          RARITY_COLORS[sticker.rarity],
                          canSelect 
                            ? "hover:scale-105 cursor-pointer" 
                            : "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <img
                          src={sticker.image_url}
                          alt={sticker.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                        
                        {/* Lock icon for unowned */}
                        {!owned && showOnlyOwned && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                            <Lock className="w-5 h-5 text-white" />
                          </div>
                        )}

                        {/* Rarity indicator */}
                        {sticker.rarity !== 'common' && (
                          <div className={cn(
                            "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                            sticker.rarity === 'rare' 
                              ? "bg-blue-500 text-white" 
                              : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          )}>
                            {RARITY_LABELS[sticker.rarity]}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/30 text-center">
              <p className="text-xs text-muted-foreground">
                Consigue más stickers participando en desafíos diarios
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
