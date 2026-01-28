import { motion } from "framer-motion";
import { AvatarConfig } from "@/hooks/useAvatar";

interface AvatarPreviewProps {
  config: AvatarConfig;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

// Color mapping for visual preview
const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  black: '#1a1a1a',
  blonde: '#F4E04D',
  red: '#FF4444',
  blue: '#4488FF',
  green: '#44FF44',
  purple: '#9944FF',
  pink: '#FF44AA',
  white: '#FFFFFF',
  yellow: '#FFFF00',
  hazel: '#A67B5B',
  gray: '#888888',
  navy: '#1a237e',
  light: '#FFDAB9',
  medium: '#DEB887',
  dark: '#8B4513',
  'fantasy-blue': '#00BFFF',
  'neon-green': '#39FF14',
  'neon-purple': '#BF00FF',
  'neon-blue': '#00FFFF',
};

const SIZE_CLASSES = {
  sm: { container: 'w-24 h-24', face: 'w-16 h-16', eyes: 'w-3 h-3', hair: 'h-6', body: 'h-8' },
  md: { container: 'w-32 h-32', face: 'w-20 h-20', eyes: 'w-4 h-4', hair: 'h-8', body: 'h-10' },
  lg: { container: 'w-48 h-48', face: 'w-28 h-28', eyes: 'w-5 h-5', hair: 'h-10', body: 'h-14' },
  xl: { container: 'w-64 h-64', face: 'w-36 h-36', eyes: 'w-6 h-6', hair: 'h-12', body: 'h-18' },
};

// Expression emoji mapping
const EXPRESSION_MAP: Record<string, string> = {
  neutral: '😐',
  happy: '😊',
  surprised: '😮',
  angry: '😠',
};

// Hair style shapes
const getHairStyle = (type: string, color: string, size: keyof typeof SIZE_CLASSES) => {
  const baseColor = COLOR_MAP[color] || color;
  const sizeClass = SIZE_CLASSES[size];
  
  switch (type) {
    case 'short':
      return (
        <div 
          className={`absolute -top-2 left-1/2 -translate-x-1/2 w-[90%] ${sizeClass.hair} rounded-t-full`}
          style={{ backgroundColor: baseColor }}
        />
      );
    case 'long':
      return (
        <>
          <div 
            className={`absolute -top-2 left-1/2 -translate-x-1/2 w-[95%] ${sizeClass.hair} rounded-t-full`}
            style={{ backgroundColor: baseColor }}
          />
          <div 
            className="absolute top-1/2 -left-2 w-3 h-1/2 rounded-bl-full"
            style={{ backgroundColor: baseColor }}
          />
          <div 
            className="absolute top-1/2 -right-2 w-3 h-1/2 rounded-br-full"
            style={{ backgroundColor: baseColor }}
          />
        </>
      );
    case 'curly':
      return (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[100%] flex justify-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="w-3 h-4 rounded-full"
              style={{ backgroundColor: baseColor, transform: `rotate(${(i - 2) * 10}deg)` }}
            />
          ))}
        </div>
      );
    case 'punk':
      return (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className="w-2 h-6 rounded-t-full"
              style={{ 
                backgroundColor: baseColor, 
                transform: `rotate(${(i - 1) * 15}deg)`,
                height: i === 1 ? '28px' : '20px'
              }}
            />
          ))}
        </div>
      );
    default:
      return null;
  }
};

// Accessory rendering
const getAccessory = (type: string) => {
  switch (type) {
    case 'sunglasses':
      return (
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 flex gap-2">
          <div className="w-5 h-3 bg-black rounded-sm" />
          <div className="w-5 h-3 bg-black rounded-sm" />
        </div>
      );
    case 'gaming-cap':
      return (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-gradient-to-r from-primary to-secondary rounded-t-full" />
      );
    case 'rgb-headphones':
      return (
        <>
          <div className="absolute top-[20%] -left-3 w-3 h-6 bg-gradient-to-b from-neon-purple to-neon-blue rounded-full animate-pulse" />
          <div className="absolute top-[20%] -right-3 w-3 h-6 bg-gradient-to-b from-neon-purple to-neon-blue rounded-full animate-pulse" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-[110%] h-2 bg-gray-800 rounded-full" />
        </>
      );
    default:
      return null;
  }
};

export function AvatarPreview({ 
  config, 
  size = 'lg',
  className = '',
  animate = true,
}: AvatarPreviewProps) {
  const sizeClass = SIZE_CLASSES[size];
  const skinColor = COLOR_MAP[config.skin.tone] || config.skin.tone;
  const eyeColor = COLOR_MAP[config.eyes.color] || config.eyes.color;
  const topColor = COLOR_MAP[config.top.color] || config.top.color;
  const bottomColor = COLOR_MAP[config.bottom.color] || config.bottom.color;
  const shoesColor = COLOR_MAP[config.shoes.color] || config.shoes.color;
  
  const faceShape = config.face.shape === 'round' 
    ? 'rounded-full' 
    : config.face.shape === 'oval' 
      ? 'rounded-[50%]' 
      : 'rounded-2xl';
  
  const eyeSize = config.eyes.type === 'big' 
    ? 'scale-125' 
    : config.eyes.type === 'cat' 
      ? 'rotate-12' 
      : '';

  const expression = EXPRESSION_MAP[config.expression.expression] || '😊';

  const Wrapper = animate ? motion.div : 'div';
  const wrapperProps = animate ? {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.3 }
  } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`${sizeClass.container} relative ${className}`}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-3xl blur-lg" />
      
      {/* Avatar container */}
      <div className="relative w-full h-full flex flex-col items-center justify-end">
        {/* Head/Face */}
        <div className="relative z-10 mb-1">
          <div 
            className={`${sizeClass.face} ${faceShape} relative`}
            style={{ backgroundColor: skinColor }}
          >
            {/* Hair */}
            {getHairStyle(config.hair.type, config.hair.color, size)}
            
            {/* Eyes */}
            <div className={`absolute top-[35%] left-1/2 -translate-x-1/2 flex gap-3 ${eyeSize}`}>
              <div 
                className={`${sizeClass.eyes} rounded-full border-2 border-white`}
                style={{ backgroundColor: eyeColor }}
              >
                <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
              </div>
              <div 
                className={`${sizeClass.eyes} rounded-full border-2 border-white`}
                style={{ backgroundColor: eyeColor }}
              >
                <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
              </div>
            </div>
            
            {/* Mouth/Expression */}
            <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 text-lg">
              {expression === '😊' && (
                <div className="w-4 h-2 border-b-2 border-gray-700 rounded-b-full" />
              )}
              {expression === '😮' && (
                <div className="w-3 h-3 bg-gray-700 rounded-full" />
              )}
              {expression === '😐' && (
                <div className="w-4 h-0.5 bg-gray-700 rounded-full" />
              )}
              {expression === '😠' && (
                <div className="w-4 h-2 border-t-2 border-gray-700 rounded-t-full" />
              )}
            </div>
            
            {/* Accessory */}
            {getAccessory(config.accessory.type)}
          </div>
        </div>
        
        {/* Body */}
        <div className={`${sizeClass.body} w-[70%] relative z-0`}>
          {/* Top */}
          <div 
            className="w-full h-[60%] rounded-t-lg"
            style={{ backgroundColor: topColor }}
          >
            {config.top.type === 'hoodie' && (
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2 rounded-b-full"
                style={{ backgroundColor: topColor, filter: 'brightness(0.8)' }}
              />
            )}
            {config.top.type === 'gaming-tee' && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-neon-green rounded-full animate-pulse" />
            )}
          </div>
          
          {/* Bottom */}
          <div 
            className="w-full h-[40%]"
            style={{ backgroundColor: bottomColor }}
          />
        </div>
        
        {/* Shoes */}
        <div className="flex gap-1">
          <div 
            className="w-4 h-2 rounded-t-lg"
            style={{ backgroundColor: shoesColor }}
          />
          <div 
            className="w-4 h-2 rounded-t-lg"
            style={{ backgroundColor: shoesColor }}
          />
        </div>
        
        {/* Pose indicator */}
        {config.pose.pose === 'victory' && (
          <div className="absolute top-0 right-0 text-2xl">✌️</div>
        )}
        {config.pose.pose === 'cool' && (
          <div className="absolute top-0 right-0 text-2xl">😎</div>
        )}
      </div>
    </Wrapper>
  );
}
