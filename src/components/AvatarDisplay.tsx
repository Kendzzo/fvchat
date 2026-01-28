import { motion } from "framer-motion";

interface AvatarDisplayProps {
  avatarUrl?: string | null;
  emoji?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-8 h-8 text-sm',
  sm: 'w-10 h-10 text-lg',
  md: 'w-14 h-14 text-2xl',
  lg: 'w-20 h-20 text-4xl',
  xl: 'w-28 h-28 text-5xl',
};

export function AvatarDisplay({ 
  avatarUrl, 
  emoji = '🎮', 
  size = 'md',
  showBorder = true,
  className = '',
}: AvatarDisplayProps) {
  const sizeClass = SIZE_CLASSES[size];
  
  return (
    <div 
      className={`relative rounded-full overflow-hidden ${showBorder ? 'p-0.5 bg-gradient-to-r from-primary via-secondary to-accent' : ''} ${className}`}
    >
      <div className={`${sizeClass} rounded-full bg-card flex items-center justify-center overflow-hidden`}>
        {avatarUrl ? (
          <motion.img 
            src={avatarUrl} 
            alt="Avatar" 
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        ) : (
          <span>{emoji}</span>
        )}
      </div>
    </div>
  );
}

// Simplified version for lists where we don't need animation
export function AvatarSimple({ 
  avatarUrl, 
  emoji = '🎮', 
  className = 'w-10 h-10',
}: { 
  avatarUrl?: string | null; 
  emoji?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-full bg-card flex items-center justify-center overflow-hidden ${className}`}>
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt="Avatar" 
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-lg">{emoji}</span>
      )}
    </div>
  );
}
