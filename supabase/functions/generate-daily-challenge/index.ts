import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Challenge themes for variety - fallback when AI is not available
const THEMES = [
  { category: "photo_fun", prompts: [
    "Haz tu cara más graciosa 😜",
    "Imita a tu animal favorito 🐶",
    "Pon tu mejor cara de sorpresa 😮",
    "Haz como si fueras un superhéroe 🦸",
    "Sonríe con todos los dientes 😁",
  ]},
  { category: "creative", prompts: [
    "Dibuja algo usando objetos de casa 🎨",
    "Crea una torre con lo que tengas cerca 🏗️",
    "Haz una figura con tus manos 🤲",
    "Construye algo con LEGO o bloques 🧱",
  ]},
  { category: "food", prompts: [
    "Muestra tu comida favorita 🍕",
    "Haz una cara con frutas 🍎",
    "Tu postre favorito 🍰",
    "El desayuno más colorido 🥣",
  ]},
  { category: "pets", prompts: [
    "Una foto con tu mascota 🐾",
    "Tu peluche favorito 🧸",
    "Imita a un gatito 🐱",
  ]},
  { category: "outdoor", prompts: [
    "Algo bonito que veas en la naturaleza 🌸",
    "Una nube con forma curiosa ☁️",
    "El árbol más grande que encuentres 🌳",
  ]},
  { category: "home", prompts: [
    "Tu rincón favorito de casa 🏠",
    "Algo que te haga muy feliz 😊",
    "Tu libro o juego favorito 📚",
  ]},
];

serve(async (req) => {
  console.log("[generate-daily-challenge] Request received:", req.method);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    console.log("[generate-daily-challenge] Checking env vars...");
    
    if (!supabaseUrl) {
      console.error("[generate-daily-challenge] Missing SUPABASE_URL");
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "Missing env var: SUPABASE_URL" 
      }), { status: 500, headers: corsHeaders });
    }
    
    if (!supabaseServiceKey) {
      console.error("[generate-daily-challenge] Missing SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "Missing env var: SUPABASE_SERVICE_ROLE_KEY" 
      }), { status: 500, headers: corsHeaders });
    }

    console.log("[generate-daily-challenge] Env vars OK, creating Supabase client...");

    // 2. Create Supabase client with SERVICE ROLE (not anon)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // 3. Get today's date in Madrid timezone
    const madridDate = new Date().toLocaleDateString('en-CA', { 
      timeZone: 'Europe/Madrid' 
    });
    
    console.log("[generate-daily-challenge] Today (Madrid):", madridDate);

    // 4. Check if challenge already exists for today
    const { data: existingChallenge, error: fetchError } = await supabase
      .from("challenges")
      .select("id, description, challenge_date")
      .eq("challenge_date", madridDate)
      .maybeSingle();

    if (fetchError) {
      console.error("[generate-daily-challenge] Error checking existing challenge:", fetchError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `DB fetch error: ${fetchError.message}`,
        code: fetchError.code
      }), { status: 500, headers: corsHeaders });
    }

    if (existingChallenge) {
      console.log("[generate-daily-challenge] Challenge already exists for today:", existingChallenge.id);
      return new Response(JSON.stringify({ 
        ok: true,
        message: "Challenge already exists",
        challenge: existingChallenge
      }), { status: 200, headers: corsHeaders });
    }

    // 5. Generate challenge description
    let challengeDescription: string;
    let generatedByAI = false;

    // Try AI generation first if API key is available
    if (LOVABLE_API_KEY) {
      console.log("[generate-daily-challenge] Attempting AI generation...");
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Eres un generador de desafíos divertidos para niños de 6 a 16 años en una app social segura.
                
Genera UN desafío creativo, divertido y fácil de entender. El niño debe poder completarlo con una foto o vídeo corto.

REGLAS:
- Lenguaje simple y alegre
- Emojis al final
- NO pedir datos personales
- NO mencionar lugares específicos fuera de casa
- Tono positivo y motivador
- Máximo 50 caracteres

Responde SOLO con el texto del desafío (sin JSON, sin comillas, solo el texto del reto con emoji).`
              },
              {
                role: "user",
                content: `Genera un desafío para hoy ${madridDate}, día de la semana: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })}`
              }
            ],
            temperature: 0.9,
            max_tokens: 100,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim() || '';
          
          if (content && content.length > 5 && content.length <= 100) {
            challengeDescription = content;
            generatedByAI = true;
            console.log("[generate-daily-challenge] AI generated:", challengeDescription);
          } else {
            console.log("[generate-daily-challenge] AI response invalid, using fallback");
          }
        } else {
          const errorText = await response.text();
          console.error("[generate-daily-challenge] AI API error:", response.status, errorText);
        }
      } catch (aiError) {
        console.error("[generate-daily-challenge] AI generation failed:", aiError);
      }
    } else {
      console.log("[generate-daily-challenge] No LOVABLE_API_KEY, using fallback");
    }

    // 6. Fallback: random challenge from predefined list
    if (!challengeDescription!) {
      const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
      const randomPrompt = randomTheme.prompts[Math.floor(Math.random() * randomTheme.prompts.length)];
      challengeDescription = randomPrompt;
      console.log("[generate-daily-challenge] Using fallback challenge:", challengeDescription);
    }

    // 7. Insert the challenge (only columns that exist in the table)
    console.log("[generate-daily-challenge] Inserting challenge...");
    
    const { data: challenge, error: insertError } = await supabase
      .from("challenges")
      .insert({
        challenge_date: madridDate,
        description: challengeDescription,
        is_active: true,
        rewards_assigned: false
      })
      .select("id, description, challenge_date")
      .single();

    if (insertError) {
      // Handle unique constraint violation (challenge already exists)
      if (insertError.code === "23505") {
        console.log("[generate-daily-challenge] Conflict - challenge was created concurrently, fetching...");
        const { data: existingAfterConflict } = await supabase
          .from("challenges")
          .select("id, description, challenge_date")
          .eq("challenge_date", madridDate)
          .single();
        
        if (existingAfterConflict) {
          return new Response(JSON.stringify({ 
            ok: true,
            message: "Challenge already exists (concurrent)",
            challenge: existingAfterConflict
          }), { status: 200, headers: corsHeaders });
        }
      }
      
      console.error("[generate-daily-challenge] Error inserting challenge:", insertError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `DB insert error: ${insertError.message}`,
        code: insertError.code,
        details: insertError.details
      }), { status: 500, headers: corsHeaders });
    }

    console.log("[generate-daily-challenge] Challenge created:", challenge);

    // 8. Try to assign rewards (optional, don't fail if this errors)
    try {
      const { data: stickers } = await supabase
        .from("stickers")
        .select("id, rarity")
        .eq("is_default", false);

      if (stickers && stickers.length > 0) {
        const epicStickers = stickers.filter(s => s.rarity === 'epic');
        const rareStickers = stickers.filter(s => s.rarity === 'rare');
        const commonStickers = stickers.filter(s => s.rarity === 'common');

        const rewards = [];
        
        if (epicStickers.length > 0) {
          rewards.push({
            challenge_id: challenge.id,
            position: 1,
            reward_type: 'sticker',
            reward_id: epicStickers[Math.floor(Math.random() * epicStickers.length)].id
          });
        }
        
        if (rareStickers.length > 0) {
          rewards.push({
            challenge_id: challenge.id,
            position: 2,
            reward_type: 'sticker',
            reward_id: rareStickers[Math.floor(Math.random() * rareStickers.length)].id
          });
        }
        
        if (commonStickers.length > 0) {
          rewards.push({
            challenge_id: challenge.id,
            position: 3,
            reward_type: 'sticker',
            reward_id: commonStickers[Math.floor(Math.random() * commonStickers.length)].id
          });
        }

        if (rewards.length > 0) {
          const { error: rewardsError } = await supabase
            .from("challenge_rewards")
            .insert(rewards);
          
          if (rewardsError) {
            console.error("[generate-daily-challenge] Error assigning rewards:", rewardsError);
          } else {
            console.log("[generate-daily-challenge] Rewards assigned:", rewards.length);
          }
        }
      }
    } catch (rewardsErr) {
      console.error("[generate-daily-challenge] Error in rewards assignment:", rewardsErr);
      // Don't fail the request, challenge is already created
    }

    // 9. Success response
    return new Response(JSON.stringify({ 
      ok: true, 
      challenge,
      generatedByAI
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("[generate-daily-challenge] Unhandled error:", err);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null
    }), { status: 500, headers: corsHeaders });
  }
});
