import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AvatarEditor from "@/components/avatar/AvatarEditor";
import { AvatarConfig, DEFAULT_AVATAR_CONFIG } from "@/components/avatar/AvatarPreview";

export default function EditAvatarPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Get existing config or use default
  const existingConfig = profile?.avatar_data as Record<string, unknown> | null;
  const initialConfig: AvatarConfig = existingConfig && 
    typeof existingConfig === 'object' && 
    'skinTone' in existingConfig
    ? existingConfig as unknown as AvatarConfig
    : DEFAULT_AVATAR_CONFIG;

  const generateSnapshot = useCallback(async (config: AvatarConfig): Promise<string> => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, "#667eea");
    gradient.addColorStop(1, "#764ba2");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#667eea"/>
            <stop offset="100%" stop-color="#764ba2"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg)"/>
        <rect x="42" y="52" width="16" height="8" fill="${config.skinTone}"/>
        <ellipse cx="50" cy="40" rx="22" ry="24" fill="${config.skinTone}"/>
        <ellipse cx="40" cy="42" rx="4" ry="5" fill="white"/>
        <ellipse cx="60" cy="42" rx="4" ry="5" fill="white"/>
        <circle cx="40" cy="43" r="2.5" fill="${config.eyeColor}"/>
        <circle cx="60" cy="43" r="2.5" fill="${config.eyeColor}"/>
        <path d="M44 54 Q50 58, 56 54" stroke="#D97B7B" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 28, 28, 200, 200);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = "data:image/svg+xml;base64," + btoa(svgString);
    });
  }, []);

  const handleSave = async (config: AvatarConfig) => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    try {
      const snapshotDataUrl = await generateSnapshot(config);
      const response = await fetch(snapshotDataUrl);
      const blob = await response.blob();
      
      const fileName = `${user.id}/avatar-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const snapshotUrl = urlData?.publicUrl || snapshotDataUrl;

      // Save to profile - cast to Json type
      const avatarDataJson = JSON.parse(JSON.stringify(config));
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_snapshot_url: snapshotUrl,
          avatar_data: avatarDataJson,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving avatar:", error);
        toast.error("Error al guardar avatar");
        return;
      }

      toast.success("¡Avatar actualizado!");
      await refreshProfile?.();
      navigate("/app/profile");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al guardar avatar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-gaming font-bold">Editar Avatar</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <AvatarEditor 
          initialConfig={initialConfig} 
          onSave={handleSave} 
          isSaving={isSaving} 
        />
      </div>
    </div>
  );
}
