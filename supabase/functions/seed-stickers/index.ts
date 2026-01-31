import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Predefined sticker themes for variety
const STICKER_THEMES = [
  { name: "Pulgar Arriba Gaming", category: "gestures", rarity: "common" },
  { name: "Corazón Brillante", category: "emotions", rarity: "common" },
  { name: "Estrella de Victoria", category: "achievements", rarity: "common" },
  { name: "Cara Feliz Gamer", category: "emotions", rarity: "common" },
  { name: "Fuego Épico", category: "effects", rarity: "rare" },
  { name: "Rayo de Energía", category: "effects", rarity: "common" },
  { name: "Trofeo Dorado", category: "achievements", rarity: "rare" },
  { name: "Explosión de Confeti", category: "celebrations", rarity: "common" },
  { name: "Cohete Espacial", category: "effects", rarity: "common" },
  { name: "Corona Real", category: "achievements", rarity: "epic" },
  { name: "Diamante Brillante", category: "achievements", rarity: "epic" },
  { name: "Unicornio Mágico", category: "fantasy", rarity: "rare" },
  { name: "Arcoíris Colorido", category: "effects", rarity: "common" },
  { name: "Carita Sorprendida", category: "emotions", rarity: "common" },
  { name: "Súper Estrella", category: "achievements", rarity: "common" },
  { name: "Gatito Kawaii", category: "animals", rarity: "rare" },
  { name: "Perrito Feliz", category: "animals", rarity: "common" },
  { name: "Osito de Peluche", category: "animals", rarity: "common" },
  { name: "Palomitas de Maíz", category: "food", rarity: "common" },
  { name: "Pizza Deliciosa", category: "food", rarity: "common" },
  { name: "Helado de Fresa", category: "food", rarity: "common" },
  { name: "Bola de Cristal", category: "fantasy", rarity: "rare" },
  { name: "Varita Mágica", category: "fantasy", rarity: "rare" },
  { name: "Escudo de Campeón", category: "achievements", rarity: "epic" },
  { name: "Medalla de Oro", category: "achievements", rarity: "rare" },
  { name: "Corazón Latiendo", category: "emotions", rarity: "common" },
  { name: "Risita Divertida", category: "emotions", rarity: "common" },
  { name: "Guiño Coqueto", category: "emotions", rarity: "common" },
  { name: "Aplauso Celebración", category: "celebrations", rarity: "common" },
  { name: "Globos de Fiesta", category: "celebrations", rarity: "common" },
];

const STICKER_PROMPT = `Create a high-quality digital sticker designed for a kids gaming social app.

Style:
- Semi-realistic digital illustration
- Clean, professional finish
- No visible line art (no outlines)
- Defined volume, lighting and depth
- Inspired by modern gaming aesthetics (Nintendo / Fortnite / Clash Royale level quality)
- NOT cartoon-flat, NOT emoji-like, NOT simplistic

Sticker characteristics:
- Transparent background (mandatory)
- No border
- No text
- No watermark
- Sharp, clean edges

Theme:
- Gaming + friendly emotion reaction
- Suitable for children aged 9–12

Forbidden:
- Violence, weapons, horror, aggressive, scary

Resolution:
- 1024x1024 PNG transparent`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { count = 20 } = await req.json().catch(() => ({ count: 20 }));
    const numToGenerate = Math.min(count, 50); // Cap at 50

    console.log(`[seed-stickers] Starting seed of ${numToGenerate} stickers`);

    // Check existing stickers count
    const { count: existingCount } = await supabase
      .from("stickers")
      .select("*", { count: "exact", head: true });

    console.log(`[seed-stickers] Existing stickers: ${existingCount || 0}`);

    const results: { name: string; success: boolean; error?: string }[] = [];
    let successCount = 0;

    // Generate stickers
    for (let i = 0; i < numToGenerate && i < STICKER_THEMES.length; i++) {
      const theme = STICKER_THEMES[i];
      
      // Check if this sticker already exists
      const { data: existing } = await supabase
        .from("stickers")
        .select("id")
        .eq("name", theme.name)
        .maybeSingle();

      if (existing) {
        console.log(`[seed-stickers] Skipping existing: ${theme.name}`);
        results.push({ name: theme.name, success: true, error: "already exists" });
        continue;
      }

      try {
        console.log(`[seed-stickers] Generating: ${theme.name}`);

        // Build enhanced prompt
        let enhancedPrompt = STICKER_PROMPT + `\n\nSpecific subject: ${theme.name}`;
        if (theme.rarity === "rare") {
          enhancedPrompt += "\n\nRarity modifiers: enhanced lighting, subtle glow effect";
        } else if (theme.rarity === "epic") {
          enhancedPrompt += "\n\nRarity modifiers: strong glow aura, magical particles, premium collectible finish";
        }

        // Call Lovable AI to generate image
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: enhancedPrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`[seed-stickers] AI error for ${theme.name}:`, errorText);
          results.push({ name: theme.name, success: false, error: `AI error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageBase64) {
          results.push({ name: theme.name, success: false, error: "No image generated" });
          continue;
        }

        // Extract base64 data and upload
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        // Sanitize filename - remove special characters for storage
        const sanitizedName = theme.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
        const fileName = `${Date.now()}-${sanitizedName}.png`;
        const { error: uploadError } = await supabase.storage
          .from("stickers")
          .upload(fileName, imageBuffer, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          console.error(`[seed-stickers] Upload error for ${theme.name}:`, uploadError);
          results.push({ name: theme.name, success: false, error: `Upload: ${uploadError.message}` });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("stickers").getPublicUrl(fileName);
        const imageUrl = urlData.publicUrl;

        // Insert into stickers table
        const { error: insertError } = await supabase
          .from("stickers")
          .insert({
            name: theme.name,
            rarity: theme.rarity,
            category: theme.category,
            image_url: imageUrl,
            prompt: enhancedPrompt,
            is_default: true,
          });

        if (insertError) {
          console.error(`[seed-stickers] Insert error for ${theme.name}:`, insertError);
          results.push({ name: theme.name, success: false, error: `Insert: ${insertError.message}` });
          continue;
        }

        console.log(`[seed-stickers] Successfully generated: ${theme.name}`);
        results.push({ name: theme.name, success: true });
        successCount++;

      } catch (err) {
        console.error(`[seed-stickers] Error generating ${theme.name}:`, err);
        results.push({ name: theme.name, success: false, error: String(err) });
      }
    }

    console.log(`[seed-stickers] Completed: ${successCount}/${numToGenerate} stickers generated`);

    return new Response(JSON.stringify({
      ok: true,
      generated: successCount,
      total_requested: numToGenerate,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[seed-stickers] Error:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
