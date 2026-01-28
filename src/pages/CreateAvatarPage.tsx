import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Sparkles, 
  Palette,
  User,
  Eye,
  Shirt,
  Footprints,
  Glasses,
  Smile,
  Move
} from "lucide-react";
import { useAvatar, AvatarConfig } from "@/hooks/useAvatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CATEGORIES = [
  { key: 'skin', label: 'Piel', icon: User },
  { key: 'face', label: 'Cara', icon: Smile },
  { key: 'eyes', label: 'Ojos', icon: Eye },
  { key: 'hair', label: 'Pelo', icon: Palette },
  { key: 'top', label: 'Camiseta', icon: Shirt },
  { key: 'bottom', label: 'Pantalón', icon: Shirt },
  { key: 'shoes', label: 'Zapatos', icon: Footprints },
  { key: 'accessory', label: 'Accesorio', icon: Glasses },
  { key: 'expression', label: 'Expresión', icon: Smile },
  { key: 'pose', label: 'Pose', icon: Move },
];

const HAIR_TYPES = ['short', 'long', 'curly', 'punk'];
const HAIR_COLORS = ['brown', 'black', 'blonde', 'red', 'blue', 'green', 'purple', 'pink'];
const FACE_SHAPES = ['round', 'oval', 'square'];
const EYE_TYPES = ['normal', 'big', 'cat'];
const EYE_COLORS = ['brown', 'blue', 'green', 'hazel', 'gray', 'yellow', 'purple'];
const SKIN_TONES = ['light', 'medium', 'dark', 'fantasy-blue'];
const TOP_TYPES = ['tshirt', 'hoodie', 'gaming-tee'];
const TOP_COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'gray', 'neon-green', 'neon-purple', 'neon-blue'];
const BOTTOM_TYPES = ['jeans', 'joggers'];
const BOTTOM_COLORS = ['blue', 'black', 'gray', 'navy'];
const SHOES_TYPES = ['sneakers', 'boots'];
const SHOES_COLORS = ['white', 'black', 'red', 'blue', 'brown'];
const ACCESSORY_TYPES = ['none', 'sunglasses', 'gaming-cap', 'rgb-headphones'];
const EXPRESSIONS = ['neutral', 'happy', 'surprised', 'angry'];
const POSES = ['idle', 'victory', 'cool'];

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
  rainbow: 'linear-gradient(90deg, red, orange, yellow, green, blue, purple)',
};

export default function CreateAvatarPage() {
  const navigate = useNavigate();
  const { generateAvatar, isGenerating, DEFAULT_AVATAR_CONFIG } = useAvatar();
  
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const currentCategory = CATEGORIES[currentStep];

  const updateConfig = (category: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [category]: {
        ...(prev[category as keyof AvatarConfig] as Record<string, string>),
        [field]: value,
      },
    }));
  };

  const handleNext = () => {
    if (currentStep < CATEGORIES.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGenerate = async () => {
    const result = await generateAvatar(config);
    
    if (result.success) {
      toast.success("¡Avatar creado con éxito!");
      navigate("/app");
    } else {
      toast.error(result.error || "Error creando avatar");
    }
  };

  const renderOptions = () => {
    const cat = currentCategory.key;

    switch (cat) {
      case 'hair':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tipo de pelo</p>
              <div className="flex flex-wrap gap-2">
                {HAIR_TYPES.map(type => (
                  <Button
                    key={type}
                    variant={config.hair.type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig('hair', 'type', type)}
                    className="capitalize"
                  >
                    {type === 'short' ? 'Corto' : type === 'long' ? 'Largo' : type === 'curly' ? 'Rizado' : 'Punk'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateConfig('hair', 'color', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.hair.color === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: COLOR_MAP[color] }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'face':
        return (
          <div className="flex flex-wrap gap-2">
            {FACE_SHAPES.map(shape => (
              <Button
                key={shape}
                variant={config.face.shape === shape ? "default" : "outline"}
                size="sm"
                onClick={() => updateConfig('face', 'shape', shape)}
                className="capitalize"
              >
                {shape === 'round' ? 'Redonda' : shape === 'oval' ? 'Ovalada' : 'Cuadrada'}
              </Button>
            ))}
          </div>
        );

      case 'eyes':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tipo</p>
              <div className="flex flex-wrap gap-2">
                {EYE_TYPES.map(type => (
                  <Button
                    key={type}
                    variant={config.eyes.type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig('eyes', 'type', type)}
                    className="capitalize"
                  >
                    {type === 'normal' ? 'Normal' : type === 'big' ? 'Grandes' : 'Gato'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {EYE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateConfig('eyes', 'color', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.eyes.color === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: COLOR_MAP[color] }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'skin':
        return (
          <div className="flex flex-wrap gap-3">
            {SKIN_TONES.map(tone => (
              <button
                key={tone}
                onClick={() => updateConfig('skin', 'tone', tone)}
                className={`w-12 h-12 rounded-xl border-2 transition-all ${
                  config.skin.tone === tone ? 'border-primary scale-110 ring-2 ring-primary/50' : 'border-transparent'
                }`}
                style={{ backgroundColor: COLOR_MAP[tone] }}
              />
            ))}
          </div>
        );

      case 'top':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tipo</p>
              <div className="flex flex-wrap gap-2">
                {TOP_TYPES.map(type => (
                  <Button
                    key={type}
                    variant={config.top.type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig('top', 'type', type)}
                    className="capitalize"
                  >
                    {type === 'tshirt' ? 'Camiseta' : type === 'hoodie' ? 'Sudadera' : 'Gaming'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {TOP_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateConfig('top', 'color', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.top.color === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: COLOR_MAP[color] }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'bottom':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tipo</p>
              <div className="flex flex-wrap gap-2">
                {BOTTOM_TYPES.map(type => (
                  <Button
                    key={type}
                    variant={config.bottom.type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig('bottom', 'type', type)}
                    className="capitalize"
                  >
                    {type === 'jeans' ? 'Vaqueros' : 'Deportivos'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {BOTTOM_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateConfig('bottom', 'color', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.bottom.color === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: COLOR_MAP[color] }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'shoes':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tipo</p>
              <div className="flex flex-wrap gap-2">
                {SHOES_TYPES.map(type => (
                  <Button
                    key={type}
                    variant={config.shoes.type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConfig('shoes', 'type', type)}
                    className="capitalize"
                  >
                    {type === 'sneakers' ? 'Zapatillas' : 'Botas'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {SHOES_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateConfig('shoes', 'color', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      config.shoes.color === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: COLOR_MAP[color] }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'accessory':
        return (
          <div className="flex flex-wrap gap-2">
            {ACCESSORY_TYPES.map(type => (
              <Button
                key={type}
                variant={config.accessory.type === type ? "default" : "outline"}
                size="sm"
                onClick={() => updateConfig('accessory', 'type', type)}
                className="capitalize"
              >
                {type === 'none' ? 'Ninguno' : 
                 type === 'sunglasses' ? 'Gafas Sol' : 
                 type === 'gaming-cap' ? 'Gorra Gaming' : 'Auriculares RGB'}
              </Button>
            ))}
          </div>
        );

      case 'expression':
        return (
          <div className="flex flex-wrap gap-2">
            {EXPRESSIONS.map(exp => (
              <Button
                key={exp}
                variant={config.expression.expression === exp ? "default" : "outline"}
                size="sm"
                onClick={() => updateConfig('expression', 'expression', exp)}
                className="capitalize"
              >
                {exp === 'neutral' ? '😐 Neutral' : 
                 exp === 'happy' ? '😊 Feliz' : 
                 exp === 'surprised' ? '😮 Sorprendido' : '😠 Enfadado'}
              </Button>
            ))}
          </div>
        );

      case 'pose':
        return (
          <div className="flex flex-wrap gap-2">
            {POSES.map(pose => (
              <Button
                key={pose}
                variant={config.pose.pose === pose ? "default" : "outline"}
                size="sm"
                onClick={() => updateConfig('pose', 'pose', pose)}
                className="capitalize"
              >
                {pose === 'idle' ? '🧍 Normal' : 
                 pose === 'victory' ? '✌️ Victoria' : '😎 Cool'}
              </Button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-gaming font-bold gradient-text">Crea tu Avatar</h1>
          <div className="text-sm text-muted-foreground">
            {currentStep + 1} / {CATEGORIES.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / CATEGORIES.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="p-4 space-y-6 pb-32">
        {/* Avatar Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-square max-w-xs mx-auto bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-3xl border border-border/50 overflow-hidden"
        >
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Avatar preview" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <div className="text-8xl mb-4">🎮</div>
              <p className="text-sm">Tu avatar aparecerá aquí</p>
            </div>
          )}
          
          {/* Decorative elements */}
          <div className="absolute top-4 right-4">
            <Sparkles className="w-6 h-6 text-warning animate-pulse" />
          </div>
        </motion.div>

        {/* Current Category */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <currentCategory.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{currentCategory.label}</h2>
              <p className="text-sm text-muted-foreground">Personaliza tu {currentCategory.label.toLowerCase()}</p>
            </div>
          </div>

          {renderOptions()}
        </motion.div>

        {/* Category dots */}
        <div className="flex justify-center gap-2">
          {CATEGORIES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep 
                  ? 'w-6 bg-primary' 
                  : i < currentStep 
                    ? 'bg-primary/50' 
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/30">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button 
              variant="outline" 
              onClick={handlePrev}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
          )}
          
          {currentStep < CATEGORIES.length - 1 ? (
            <Button 
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-primary to-secondary"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 bg-gradient-to-r from-success to-primary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Crear Avatar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
