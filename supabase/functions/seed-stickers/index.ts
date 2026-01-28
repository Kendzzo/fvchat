import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 5 starter stickers with predefined themes
const STARTER_STICKERS = [
  { name: "Pulgar Arriba Gaming", category: "gestures" },
  { name: "Corazón Brillante", category: "emotions" },
  { name: "Estrella de Victoria", category: "achievements" },
  { name: "Cara Feliz Gamer", category: "emotions" },
  { name: "Fuego Épico", category: "effects" },
];

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

    // Check if starter stickers already exist
    const { data: existingStarters, error: checkError } = await supabase
      .from("stickers")
      .select("id")
      .eq("is_default", true);

    if (checkError) {
      throw checkError;
    }

    if (existingStarters && existingStarters.length >= 5) {
      console.log("Starter stickers already exist, skipping seed");
      return new Response(JSON.stringify({ 
        message: "Starter stickers already exist",
        count: existingStarters.length 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const stickerDef of STARTER_STICKERS) {
      try {
        console.log(`Generating starter sticker: ${stickerDef.name}`);

        // Call generate-sticker function internally
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-sticker`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: stickerDef.name,
            rarity: "common",
            category: stickerDef.category,
            is_default: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to generate ${stickerDef.name}:`, errorText);
          results.push({ name: stickerDef.name, success: false, error: errorText });
          continue;
        }

        const data = await response.json();
        results.push({ name: stickerDef.name, success: true, sticker: data.sticker });
        console.log(`Successfully generated: ${stickerDef.name}`);
      } catch (err) {
        console.error(`Error generating ${stickerDef.name}:`, err);
        results.push({ name: stickerDef.name, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Seed complete: ${successCount}/${STARTER_STICKERS.length} stickers generated`);

    return new Response(JSON.stringify({ 
      message: `Generated ${successCount} starter stickers`,
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
