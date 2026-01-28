import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AvatarConfig {
  hair: { type: string; color: string };
  face: { shape: string };
  eyes: { type: string; color: string };
  skin: { tone: string };
  top: { type: string; color: string };
  bottom: { type: string; color: string };
  shoes: { type: string; color: string };
  accessory: { type: string; color?: string };
  pose: { pose: string };
  expression: { expression: string };
}

function buildPrompt(config: AvatarConfig): string {
  const parts = [
    "Generate a cute, friendly 3D low-poly avatar character in Roblox/Fortnite gaming style.",
    "The character should be kid-friendly, colorful, and have a gaming aesthetic.",
    "Character details:",
    `- Hair: ${config.hair.type} style in ${config.hair.color} color`,
    `- Face shape: ${config.face.shape}`,
    `- Eyes: ${config.eyes.type} eyes in ${config.eyes.color} color`,
    `- Skin tone: ${config.skin.tone}`,
    `- Top: ${config.top.type} in ${config.top.color} color`,
    `- Bottom: ${config.bottom.type} in ${config.bottom.color} color`,
    `- Shoes: ${config.shoes.type} in ${config.shoes.color} color`,
    config.accessory.type !== "none" ? `- Accessory: ${config.accessory.type}${config.accessory.color ? ` in ${config.accessory.color}` : ""}` : "",
    `- Pose: ${config.pose.pose}`,
    `- Expression: ${config.expression.expression}`,
    "Style: 3D render, vibrant colors, clean lines, no background (transparent or solid color), centered character, full body view.",
    "The character should look like a gaming avatar that kids would love to use.",
  ].filter(Boolean);

  return parts.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's auth
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // Parse request
    const { avatar_config }: { avatar_config: AvatarConfig } = await req.json();

    if (!avatar_config) {
      return new Response(JSON.stringify({ error: "avatar_config is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating avatar for user:", userId);
    console.log("Avatar config:", JSON.stringify(avatar_config));

    // Build prompt for image generation
    const prompt = buildPrompt(avatar_config);
    console.log("Generated prompt:", prompt);

    // Call Lovable AI to generate avatar image
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI generation failed:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Servicio AI temporalmente no disponible." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Error generating avatar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract image from response
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Failed to generate avatar image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service client for storage and profile updates
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob and upload to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `${userId}/avatar-${Date.now()}.png`;
    
    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save avatar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;
    console.log("Avatar uploaded to:", avatarUrl);

    // Update profile with avatar config and snapshot URL
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        avatar_data: avatar_config,
        avatar_snapshot_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save avatar to profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Avatar saved successfully for user:", userId);

    return new Response(JSON.stringify({
      success: true,
      avatar_url: avatarUrl,
      avatar_config,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate avatar error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
