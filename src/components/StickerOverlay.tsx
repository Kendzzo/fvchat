import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw, Maximize2 } from 'lucide-react';
import { Sticker } from '@/hooks/useStickers';
import { cn } from '@/lib/utils';

export interface PlacedSticker {
  id: string;
  sticker: Sticker;
  x: number; // 0-1 relative
  y: number; // 0-1 relative
  scale: number;
  rotation: number;
}

interface StickerOverlayProps {
  stickers: PlacedSticker[];
  onUpdateSticker: (id: string, updates: Partial<PlacedSticker>) => void;
  onRemoveSticker: (id: string) => void;
  editable?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}

interface DraggableStickerProps {
  sticker: PlacedSticker;
  onUpdate: (updates: Partial<PlacedSticker>) => void;
  onRemove: () => void;
  editable: boolean;
  containerRect: DOMRect | null;
}

function DraggableSticker({ sticker, onUpdate, onRemove, editable, containerRect }: DraggableStickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const stickerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, stickerX: 0, stickerY: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    
    setIsDragging(true);
    setIsSelected(true);
    
    const rect = containerRect;
    if (!rect) return;

    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      stickerX: sticker.x,
      stickerY: sticker.y
    };

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  }, [editable, containerRect, sticker.x, sticker.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRect) return;
    e.stopPropagation();
    e.preventDefault();

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;

    const newX = Math.max(0, Math.min(1, startPosRef.current.stickerX + deltaX / containerRect.width));
    const newY = Math.max(0, Math.min(1, startPosRef.current.stickerY + deltaY / containerRect.height));

    onUpdate({ x: newX, y: newY });
  }, [isDragging, containerRect, onUpdate]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
  }, [isDragging]);

  const handleScaleUp = () => {
    onUpdate({ scale: Math.min(3, sticker.scale + 0.2) });
  };

  const handleScaleDown = () => {
    onUpdate({ scale: Math.max(0.3, sticker.scale - 0.2) });
  };

  const handleRotate = () => {
    onUpdate({ rotation: (sticker.rotation + 15) % 360 });
  };

  // Calculate pixel position
  const pixelX = containerRect ? sticker.x * containerRect.width : 0;
  const pixelY = containerRect ? sticker.y * containerRect.height : 0;

  return (
    <motion.div
      ref={stickerRef}
      className={cn(
        "absolute touch-none select-none",
        editable && "cursor-move",
        isSelected && editable && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        left: pixelX,
        top: pixelY,
        transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
        zIndex: isDragging ? 100 : 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(e) => {
        e.stopPropagation();
        if (editable) setIsSelected(!isSelected);
      }}
    >
      <img
        src={sticker.sticker.image_url}
        alt={sticker.sticker.name}
        className="w-20 h-20 object-contain pointer-events-none"
        draggable={false}
      />

      {/* Controls - only show when selected and editable */}
      {editable && isSelected && (
        <div 
          className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-card/90 backdrop-blur rounded-full p-1 shadow-lg"
          style={{ transform: `translate(-50%, 0) rotate(${-sticker.rotation}deg) scale(${1/sticker.scale})` }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); handleScaleDown(); }}
            className="p-1.5 rounded-full hover:bg-muted text-xs font-bold"
          >
            −
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleScaleUp(); }}
            className="p-1.5 rounded-full hover:bg-muted"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleRotate(); }}
            className="p-1.5 rounded-full hover:bg-muted"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-full hover:bg-destructive/20 text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function StickerOverlay({ 
  stickers, 
  onUpdateSticker, 
  onRemoveSticker, 
  editable = false,
  containerRef
}: StickerOverlayProps) {
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (containerRef?.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [containerRef]);

  if (stickers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stickers.map((sticker) => (
        <div key={sticker.id} className="pointer-events-auto">
          <DraggableSticker
            sticker={sticker}
            onUpdate={(updates) => onUpdateSticker(sticker.id, updates)}
            onRemove={() => onRemoveSticker(sticker.id)}
            editable={editable}
            containerRect={containerRect}
          />
        </div>
      ))}
    </div>
  );
}
