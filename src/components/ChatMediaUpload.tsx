import { useRef, useState } from 'react';
import { Image, Mic, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMediaUploadProps {
  onMediaReady: (url: string, type: 'image' | 'video' | 'audio') => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 10; // 10 seconds

export function ChatMediaUpload({ onMediaReady, disabled }: ChatMediaUploadProps) {
  const { user } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'video' | null>(null);
  const [showAudioModal, setShowAudioModal] = useState(false);

  const handleImageClick = () => {
    if (disabled || isUploading) return;
    imageInputRef.current?.click();
  };

  const handleVideoClick = () => {
    if (disabled || isUploading) return;
    videoInputRef.current?.click();
  };

  const handleAudioClick = () => {
    if (disabled || isUploading) return;
    setShowAudioModal(true);
  };

  const validateVideoMetadata = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > MAX_VIDEO_DURATION) {
          toast.error(`El vídeo debe durar máximo ${MAX_VIDEO_DURATION} segundos (actual: ${Math.round(video.duration)}s)`);
          resolve(false);
        } else {
          resolve(true);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        // If we can't read metadata, allow the upload
        resolve(true);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File, type: 'image' | 'video') => {
    if (!user) {
      toast.error('No autenticado');
      return;
    }

    // Validate size
    if (type === 'image' && file.size > MAX_IMAGE_SIZE) {
      toast.error('La imagen debe ser menor a 10MB');
      return;
    }

    if (type === 'video' && file.size > MAX_VIDEO_SIZE) {
      toast.error('El vídeo debe ser menor a 50MB');
      return;
    }

    // Validate video duration
    if (type === 'video') {
      const isValidDuration = await validateVideoMetadata(file);
      if (!isValidDuration) return;
    }

    setIsUploading(true);
    setUploadType(type);

    try {
      const fileExt = file.name.split('.').pop() || (type === 'image' ? 'jpg' : 'mp4');
      const fileName = `${user.id}/chat/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('content')
        .getPublicUrl(fileName);

      onMediaReady(urlData.publicUrl, type);
      toast.success(`${type === 'image' ? 'Imagen' : 'Vídeo'} adjuntado`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir archivo');
    } finally {
      setIsUploading(false);
      setUploadType(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, 'image');
    }
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, 'video');
    }
    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,video/quicktime,video/mp4"
        capture="environment"
        onChange={handleVideoChange}
        className="hidden"
      />

      {/* Image button */}
      <button
        onClick={handleImageClick}
        disabled={disabled || isUploading}
        className="p-3 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors px-[14px] py-[14px] disabled:opacity-50"
      >
        {isUploading && uploadType === 'image' ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : (
          <Image className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Audio button */}
      <button
        onClick={handleAudioClick}
        disabled={disabled || isUploading}
        className="p-3 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors px-[14px] py-[14px] disabled:opacity-50"
      >
        {isUploading && uploadType === 'video' ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Audio modal - Centered modal with Portal for mobile safety */}
      <AnimatePresence>
        {showAudioModal && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAudioModal(false)}
              className="fixed inset-0 bg-black/50 z-[999]"
              style={{ touchAction: 'none' }}
            />
            {/* Centered Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed z-[999] bg-card shadow-xl"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(92vw, 420px)',
                maxHeight: '80vh',
                borderRadius: '24px',
                padding: '20px',
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Nota de voz</h3>
                <button 
                  onClick={() => setShowAudioModal(false)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center py-6">
                <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Función en desarrollo
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Pronto podrás enviar notas de voz
                </p>
              </div>
              <button
                onClick={() => setShowAudioModal(false)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
              >
                Entendido
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
