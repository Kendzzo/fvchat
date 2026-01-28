import { cn } from "@/lib/utils";

interface AvatarBadgeProps {
  avatarUrl?: string | null;
  nick?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[8px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-lg',
};

const BORDER_CLASSES = {
  xs: 'p-[1px]',
  sm: 'p-[1px]',
  md: 'p-[2px]',
  lg: 'p-[2px]',
  xl: 'p-[3px]',
};

/**
 * AvatarBadge - Global component to display user avatars across the app
 * 
 * Uses avatar_snapshot_url if available, otherwise shows initials from nick
 * MUST be used in: Feed, Comments, Chat, Profile, Podium, User Search, Friend Requests
 */
export function AvatarBadge({ 
  avatarUrl, 
  nick = '',
  size = 'md',
  showBorder = true,
  className = '',
  onClick,
}: AvatarBadgeProps) {
  const sizeClass = SIZE_CLASSES[size];
  const borderClass = BORDER_CLASSES[size];
  
  // Get initials from nick (first 2 characters, uppercase)
  const initials = nick.slice(0, 2).toUpperCase() || '??';
  
  // Generate a consistent color based on nick
  const getColorFromNick = (nick: string) => {
    const colors = [
      'from-primary to-secondary',
      'from-secondary to-accent',
      'from-accent to-primary',
      'from-neon-purple to-neon-blue',
      'from-warning to-destructive',
    ];
    const index = nick.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  const gradientColor = getColorFromNick(nick);
  
  const content = avatarUrl ? (
    <img 
      src={avatarUrl} 
      alt={`Avatar de ${nick}`}
      className="w-full h-full object-cover rounded-full"
      loading="lazy"
      onError={(e) => {
        // Fallback to initials on error
        (e.target as HTMLImageElement).style.display = 'none';
        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
      }}
    />
  ) : null;
  
  const fallback = (
    <div 
      className={cn(
        "w-full h-full rounded-full flex items-center justify-center font-bold",
        `bg-gradient-to-br ${gradientColor} text-white`,
        avatarUrl && 'hidden'
      )}
    >
      {initials}
    </div>
  );

  const Component = onClick ? 'button' : 'div';

  if (showBorder) {
    return (
      <Component
        onClick={onClick}
        className={cn(
          "rounded-full bg-gradient-to-r from-primary via-secondary to-accent",
          borderClass,
          className,
          onClick && "cursor-pointer hover:scale-105 transition-transform"
        )}
      >
        <div className={cn(sizeClass, "rounded-full bg-card overflow-hidden flex items-center justify-center")}>
          {content}
          {fallback}
        </div>
      </Component>
    );
  }

  return (
    <Component
      onClick={onClick}
      className={cn(
        sizeClass,
        "rounded-full bg-card overflow-hidden flex items-center justify-center",
        className,
        onClick && "cursor-pointer hover:scale-105 transition-transform"
      )}
    >
      {content}
      {fallback}
    </Component>
  );
}

/**
 * AvatarBadgeWithStatus - Avatar with online/offline indicator
 */
export function AvatarBadgeWithStatus({
  avatarUrl,
  nick,
  isOnline = false,
  size = 'md',
  showBorder = true,
  className = '',
}: AvatarBadgeProps & { isOnline?: boolean }) {
  const statusSize = size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  
  return (
    <div className="relative">
      <AvatarBadge 
        avatarUrl={avatarUrl}
        nick={nick}
        size={size}
        showBorder={showBorder}
        className={className}
      />
      {isOnline && (
        <div className={cn(
          statusSize,
          "absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-card"
        )} />
      )}
    </div>
  );
}
