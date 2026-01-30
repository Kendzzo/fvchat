import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
interface ProfilePhotoProps {
  url?: string | null;
  nick?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  className?: string;
  onClick?: () => void;
  editable?: boolean;
}
const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[8px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-lg'
};
const BORDER_CLASSES = {
  xs: 'p-[1px]',
  sm: 'p-[1px]',
  md: 'p-[2px]',
  lg: 'p-[2px]',
  xl: 'p-[3px]'
};

// Color palette for initials fallback
const GRADIENT_COLORS = ['from-primary to-secondary', 'from-secondary to-accent', 'from-accent to-primary', 'from-purple-500 to-blue-500', 'from-orange-500 to-red-500'];

/**
 * ProfilePhoto - Universal profile photo component for VFC
 * 
 * MUST be used everywhere a user is displayed:
 * - Feed posts (author)
 * - Comments (author) 
 * - Chat list & conversation
 * - Profile page
 * - Podium (rankings)
 * - User search & friend requests
 * 
 * Uses profile_photo_url from profiles table, falls back to initials
 */
export function ProfilePhoto({
  url,
  nick = '',
  size = 'md',
  showBorder = true,
  className = '',
  onClick,
  editable = false
}: ProfilePhotoProps) {
  const sizeClass = SIZE_CLASSES[size];
  const borderClass = BORDER_CLASSES[size];

  // Get initials (first 2 characters, uppercase)
  const initials = nick.slice(0, 2).toUpperCase() || '🎮';

  // Consistent color based on nick
  const colorIndex = nick ? nick.charCodeAt(0) % GRADIENT_COLORS.length : 0;
  const gradientColor = GRADIENT_COLORS[colorIndex];
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn(`Profile photo failed to load: ${url}`);
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const fallback = target.nextElementSibling as HTMLElement;
    if (fallback) fallback.classList.remove('hidden');
  };
  const content = url ? <>
      <img src={url} alt={`Foto de ${nick || 'usuario'}`} className="w-full h-full rounded-full object-fill border-8 border-none shadow-card" loading="lazy" onError={handleImageError} />
      <div className={cn("w-full h-full rounded-full flex items-center justify-center font-bold hidden", `bg-gradient-to-br ${gradientColor} text-white`)}>
        {initials}
      </div>
    </> : <div className={cn("w-full h-full rounded-full flex items-center justify-center font-bold mx-0 gap-0", `bg-gradient-to-br ${gradientColor} text-white`)}>
      {initials}
    </div>;
  const Component = onClick ? 'button' : 'div';
  if (showBorder) {
    return <Component onClick={onClick} className={cn("relative bg-gradient-to-r from-primary via-secondary to-accent flex-shrink-0 py-[5px] ml-0 pl-[16px] text-base opacity-100 shadow-none font-light text-center mr-0 border-none rounded-full border-4 border-white", borderClass, className, onClick && "cursor-pointer hover:scale-105 transition-transform")}>
        <div className={cn(sizeClass, "rounded-full bg-card overflow-hidden flex items-center justify-center")}>
          {content}
        </div>
        {editable && <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center shadow-lg">
            <Camera className="text-secondary-foreground w-[20px] h-[20px]" />
          </div>}
      </Component>;
  }
  return <Component onClick={onClick} className={cn("relative", sizeClass, "rounded-full bg-card overflow-hidden flex items-center justify-center flex-shrink-0", className, onClick && "cursor-pointer hover:scale-105 transition-transform")}>
      {content}
      {editable && <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center shadow-lg">
          <Camera className="w-3 h-3 text-secondary-foreground" />
        </div>}
    </Component>;
}

/**
 * ProfilePhotoWithStatus - Profile photo with online/offline indicator
 */
export function ProfilePhotoWithStatus({
  url,
  nick,
  isOnline = false,
  size = 'md',
  showBorder = true,
  className = ''
}: ProfilePhotoProps & {
  isOnline?: boolean;
}) {
  const statusSize = size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  return <div className="relative flex-shrink-0">
      <ProfilePhoto url={url} nick={nick} size={size} showBorder={showBorder} className={className} />
      {isOnline && <div className={cn(statusSize, "absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-card")} />}
    </div>;
}