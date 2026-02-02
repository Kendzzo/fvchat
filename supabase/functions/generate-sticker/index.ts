import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STICKER_PROMPT = `Create a high-quality digital sticker designed for a kids gaming social app.

Style:
- Semi-realistic digital illustration
- Clean, professional finish
- No visible line art (no outlines)
- Defined volume, lighting and depth
- Inspired by modern gaming aesthetics (Nintendo / Fortnite / Clash Royale level quality)
- NOT cartoon-flat, NOT emoji-like, NOT simplistic

Sticker characteristics:
- Solid pure white background (mandatory)
- Background must be a single flat color: #FFFFFF
- No transparency
- No checkerboard pattern
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
- 1024x1024 PNG with white background (#FFFFFF)`;

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

    // Parse request body
    const { name, rarity = "common", category = "emotions", is_default = false } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build enhanced prompt based on rarity
    let enhancedPrompt = STICKER_PROMPT + `\n\nSpecific subject: ${name}`;

    if (rarity === "rare") {
      enhancedPrompt += "\n\nRarity modifiers: enhanced lighting, subtle glow effect";
    } else if (rarity === "epic") {
      enhancedPrompt += "\n\nRarity modifiers: strong glow aura, magical particles, premium collectible finish";
    }

    console.log("Generating sticker:", { name, rarity, category });

    // Call Lovable AI to generate image
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      throw new Error("No image generated");
    }

    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload to storage
    const fileName = `${Date.now()}-${name.toLowerCase().replace(/\s+/g, "-")}.png`;
    const { error: uploadError } = await supabase.storage.from("stickers").upload(fileName, imageBuffer, {
      contentType: "image/png",
      upsert: false,
    });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload sticker: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("stickers").getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    // MODERATION: Verify sticker is safe before saving
    console.log("[generate-sticker] Moderating generated sticker");

    let moderated = true;
    try {
      const moderationResponse = await fetch(`${supabaseUrl}/functions/v1/moderate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          imageBase64: imageBase64,
          surface: "sticker",
          checkText: true,
        }),
      });

      if (moderationResponse.ok) {
        const modResult = await moderationResponse.json();
        if (!modResult.allowed) {
          console.error("[generate-sticker] Sticker failed moderation:", modResult.reason);
          moderated = false;
          // Don't throw - just mark as not moderated and don't assign to users
        }
      }
    } catch (modError) {
      console.error("[generate-sticker] Moderation check failed (allowing):", modError);
      // Fail open for sticker generation
    }

    // Insert into stickers table with moderation status
    const { data: sticker, error: insertError } = await supabase
      .from("stickers")
      .insert({
        name,
        rarity,
        category,
        image_url: imageUrl,
        prompt: enhancedPrompt,
        is_default: moderated ? is_default : false, // Don't make default if failed moderation
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save sticker: ${insertError.message}`);
    }

    // If moderation failed, don't return success
    if (!moderated) {
      console.log("[generate-sticker] Sticker created but failed moderation, not assigning");
      return new Response(
        JSON.stringify({
          error: "Sticker generated but failed content moderation",
          moderated: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Sticker generated successfully:", sticker.id);

    return new Response(JSON.stringify({ sticker }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
