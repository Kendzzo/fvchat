import { useState, useEffect } from 'react';
import { useStickers, PostSticker } from '@/hooks/useStickers';

interface PostStickerRendererProps {
  postId: string;
}

export function PostStickerRenderer({ postId }: PostStickerRendererProps) {
  const { fetchPostStickers } = useStickers();
  const [stickers, setStickers] = useState<PostSticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchPostStickers(postId);
      setStickers(data);
      setIsLoading(false);
    };
    load();
  }, [postId, fetchPostStickers]);

  if (isLoading || stickers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stickers.map((ps) => {
        if (!ps.sticker) return null;

        return (
          <div
            key={ps.id}
            className="absolute"
            style={{
              left: `${ps.x * 100}%`,
              top: `${ps.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${ps.scale}) rotate(${ps.rotation}deg)`,
            }}
          >
            <img
              src={ps.sticker.image_url}
              alt={ps.sticker.name}
              className="w-16 h-16 object-contain"
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
}
