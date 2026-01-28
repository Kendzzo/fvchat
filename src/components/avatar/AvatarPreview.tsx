import { memo } from "react";

export interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: "#FFD5B4",
  hairStyle: "short",
  hairColor: "#4A3728",
  eyeColor: "#4A90D9",
  outfit: "hoodie",
  outfitColor: "#6366F1",
  accessory: "none",
};

interface AvatarPreviewProps {
  config: AvatarConfig;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: 64,
  md: 96,
  lg: 128,
  xl: 200,
};

// Hair styles SVG paths
const hairStyles: Record<string, (color: string) => JSX.Element> = {
  short: (color) => (
    <path
      d="M20 18 C20 10, 30 5, 50 5 C70 5, 80 10, 80 18 C80 25, 75 28, 50 28 C25 28, 20 25, 20 18"
      fill={color}
    />
  ),
  long: (color) => (
    <>
      <path
        d="M15 20 C15 8, 30 2, 50 2 C70 2, 85 8, 85 20 C85 35, 80 55, 75 65 L25 65 C20 55, 15 35, 15 20"
        fill={color}
      />
      <path
        d="M20 25 C22 35, 25 45, 28 55 L72 55 C75 45, 78 35, 80 25"
        fill={color}
        opacity="0.8"
      />
    </>
  ),
  curly: (color) => (
    <>
      <ellipse cx="30" cy="15" rx="12" ry="10" fill={color} />
      <ellipse cx="50" cy="10" rx="12" ry="10" fill={color} />
      <ellipse cx="70" cy="15" rx="12" ry="10" fill={color} />
      <ellipse cx="22" cy="28" rx="10" ry="8" fill={color} />
      <ellipse cx="78" cy="28" rx="10" ry="8" fill={color} />
    </>
  ),
  spiky: (color) => (
    <>
      <polygon points="50,2 55,20 60,5 65,22 72,8 75,25 50,28 25,25 28,8 35,22 40,5 45,20" fill={color} />
      <path d="M25 25 L75 25 L75 35 C75 35, 50 38, 25 35 Z" fill={color} />
    </>
  ),
  ponytail: (color) => (
    <>
      <path
        d="M20 18 C20 10, 30 5, 50 5 C70 5, 80 10, 80 18 C80 25, 75 28, 50 28 C25 28, 20 25, 20 18"
        fill={color}
      />
      <ellipse cx="50" cy="8" rx="20" ry="6" fill={color} />
      <path d="M65 12 Q85 15, 88 35 Q90 55, 82 70" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
    </>
  ),
  buzz: (color) => (
    <path
      d="M22 22 C22 14, 32 8, 50 8 C68 8, 78 14, 78 22 C78 28, 70 32, 50 32 C30 32, 22 28, 22 22"
      fill={color}
      opacity="0.6"
    />
  ),
};

// Outfit styles
const outfitStyles: Record<string, (color: string) => JSX.Element> = {
  hoodie: (color) => (
    <>
      <path
        d="M25 70 L30 55 L70 55 L75 70 L85 95 L15 95 Z"
        fill={color}
      />
      <path d="M40 55 Q50 65, 60 55" stroke={color} strokeWidth="2" fill="none" opacity="0.7" />
      <ellipse cx="50" cy="58" rx="8" ry="4" fill={color} opacity="0.8" />
    </>
  ),
  tshirt: (color) => (
    <>
      <path
        d="M30 55 L25 65 L15 70 L15 75 L25 72 L25 95 L75 95 L75 72 L85 75 L85 70 L75 65 L70 55 Z"
        fill={color}
      />
    </>
  ),
  jacket: (color) => (
    <>
      <path
        d="M25 55 L20 70 L15 95 L35 95 L35 65 L65 65 L65 95 L85 95 L80 70 L75 55 Z"
        fill={color}
      />
      <path d="M35 65 L35 95 L65 95 L65 65" fill="#1F2937" />
      <line x1="50" y1="65" x2="50" y2="95" stroke={color} strokeWidth="3" />
    </>
  ),
  dress: (color) => (
    <>
      <path
        d="M35 55 L30 70 L20 95 L80 95 L70 70 L65 55 Z"
        fill={color}
      />
      <path d="M35 55 L50 60 L65 55" stroke={color} strokeWidth="2" fill="none" opacity="0.6" />
    </>
  ),
  sporty: (color) => (
    <>
      <path
        d="M28 55 L22 70 L18 95 L82 95 L78 70 L72 55 Z"
        fill={color}
      />
      <path d="M30 70 L70 70" stroke="white" strokeWidth="3" />
      <path d="M35 80 L65 80" stroke="white" strokeWidth="2" />
    </>
  ),
};

// Accessories
const accessories: Record<string, JSX.Element> = {
  none: <></>,
  glasses: (
    <>
      <rect x="30" y="38" width="15" height="12" rx="3" fill="none" stroke="#1F2937" strokeWidth="2" />
      <rect x="55" y="38" width="15" height="12" rx="3" fill="none" stroke="#1F2937" strokeWidth="2" />
      <line x1="45" y1="43" x2="55" y2="43" stroke="#1F2937" strokeWidth="2" />
    </>
  ),
  sunglasses: (
    <>
      <rect x="28" y="36" width="18" height="14" rx="2" fill="#1F2937" />
      <rect x="54" y="36" width="18" height="14" rx="2" fill="#1F2937" />
      <line x1="46" y1="42" x2="54" y2="42" stroke="#1F2937" strokeWidth="2" />
      <line x1="28" y1="40" x2="20" y2="38" stroke="#1F2937" strokeWidth="2" />
      <line x1="72" y1="40" x2="80" y2="38" stroke="#1F2937" strokeWidth="2" />
    </>
  ),
  headphones: (
    <>
      <path d="M18 40 Q18 15, 50 15 Q82 15, 82 40" stroke="#374151" strokeWidth="4" fill="none" />
      <ellipse cx="18" cy="45" rx="6" ry="10" fill="#6366F1" />
      <ellipse cx="82" cy="45" rx="6" ry="10" fill="#6366F1" />
    </>
  ),
  cap: (
    <>
      <path d="M18 25 Q18 12, 50 10 Q82 12, 82 25 L85 30 L15 30 Z" fill="#EF4444" />
      <path d="M15 28 L30 32 L30 28" fill="#EF4444" />
    </>
  ),
  earrings: (
    <>
      <circle cx="22" cy="52" r="3" fill="#FFD700" />
      <circle cx="78" cy="52" r="3" fill="#FFD700" />
    </>
  ),
};

function AvatarPreview({ config, size = "lg", className = "" }: AvatarPreviewProps) {
  const pixelSize = sizeMap[size];

  return (
    <div className={`relative ${className}`} style={{ width: pixelSize, height: pixelSize }}>
      <svg
        viewBox="0 0 100 100"
        width={pixelSize}
        height={pixelSize}
        className="rounded-full overflow-hidden"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
      >
        {/* Background circle */}
        <circle cx="50" cy="50" r="48" fill="url(#avatarGradient)" />
        
        <defs>
          <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>

        {/* Body/Outfit */}
        {outfitStyles[config.outfit]?.(config.outfitColor)}

        {/* Neck */}
        <rect x="42" y="52" width="16" height="8" fill={config.skinTone} />

        {/* Head */}
        <ellipse cx="50" cy="40" rx="22" ry="24" fill={config.skinTone} />

        {/* Hair */}
        {hairStyles[config.hairStyle]?.(config.hairColor)}

        {/* Eyes */}
        <ellipse cx="40" cy="42" rx="4" ry="5" fill="white" />
        <ellipse cx="60" cy="42" rx="4" ry="5" fill="white" />
        <circle cx="40" cy="43" r="2.5" fill={config.eyeColor} />
        <circle cx="60" cy="43" r="2.5" fill={config.eyeColor} />
        <circle cx="41" cy="42" r="1" fill="white" />
        <circle cx="61" cy="42" r="1" fill="white" />

        {/* Eyebrows */}
        <path d="M34 36 Q40 34, 46 36" stroke={config.hairColor} strokeWidth="1.5" fill="none" />
        <path d="M54 36 Q60 34, 66 36" stroke={config.hairColor} strokeWidth="1.5" fill="none" />

        {/* Nose */}
        <path d="M50 45 L48 50 L52 50" stroke={config.skinTone} strokeWidth="1" fill="none" filter="brightness(0.9)" />

        {/* Mouth */}
        <path d="M44 54 Q50 58, 56 54" stroke="#D97B7B" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Blush */}
        <ellipse cx="32" cy="50" rx="4" ry="2" fill="#FFB6C1" opacity="0.4" />
        <ellipse cx="68" cy="50" rx="4" ry="2" fill="#FFB6C1" opacity="0.4" />

        {/* Accessory */}
        {accessories[config.accessory]}
      </svg>
    </div>
  );
}

export default memo(AvatarPreview);
