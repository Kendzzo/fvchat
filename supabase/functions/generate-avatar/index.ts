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

async function generateImageWithRetry(
  prompt: string,
  apiKey: string,
  maxRetries = 2
): Promise<{ imageData: string | null; error: string | null }> {
  const models = [
    "google/gemini-2.5-flash-image",
    "google/gemini-3-pro-image-preview", // Fallback to pro model
  ];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const model = models[Math.min(attempt, models.length - 1)];
    console.log(`Attempt ${attempt + 1}: Using model ${model}`);

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI HTTP error (${aiResponse.status}):`, errorText);

        if (aiResponse.status === 429) {
          console.log("Rate limited, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }
        if (aiResponse.status === 402) {
          return { imageData: null, error: "Servicio AI temporalmente no disponible. Intenta más tarde." };
        }
        continue;
      }

      const aiData = await aiResponse.json();
      
      // Check for errors inside the response (rate limits can come as 200 with error in body)
      const choiceError = aiData.choices?.[0]?.error;
      if (choiceError) {
        console.error("Error in AI response:", JSON.stringify(choiceError));
        
        // Check if it's a rate limit error
        const rawError = choiceError.metadata?.raw || "";
        if (rawError.includes("429") || rawError.includes("RESOURCE_EXHAUSTED")) {
          console.log("Rate limit detected in response body, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }
        continue;
      }

      // Extract image from response
      const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (imageData) {
        console.log("Image generated successfully");
        return { imageData, error: null };
      }

      console.error("No image in AI response:", JSON.stringify(aiData).substring(0, 500));
    } catch (e) {
      console.error(`Attempt ${attempt + 1} failed:`, e);
    }

    // Wait before retry
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }

  return { imageData: null, error: "No se pudo generar el avatar. Intenta de nuevo en unos segundos." };
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

    // Generate image with retry logic
    const { imageData, error: genError } = await generateImageWithRetry(prompt, LOVABLE_API_KEY, 3);

    if (!imageData || genError) {
      console.error("Image generation failed after retries");
      return new Response(JSON.stringify({ 
        error: genError || "No se pudo generar el avatar. Intenta de nuevo.",
        retry: true 
      }), {
        status: 503,
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
      error: error instanceof Error ? error.message : "Error desconocido",
      retry: true
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
