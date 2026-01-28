import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Challenge themes for variety
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in Madrid timezone
    const madridDate = new Date().toLocaleDateString('en-CA', { 
      timeZone: 'Europe/Madrid' 
    });

    // Check if challenge already exists for today
    const { data: existingChallenge } = await supabase
      .from("challenges")
      .select("id")
      .eq("challenge_date", madridDate)
      .maybeSingle();

    if (existingChallenge) {
      console.log("Challenge already exists for today:", madridDate);
      return new Response(JSON.stringify({ 
        message: "Challenge already exists",
        challenge_id: existingChallenge.id 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let challengeDescription: string;
    let challengeTitle: string;

    // Try AI generation first
    if (LOVABLE_API_KEY) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
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

Responde SOLO con JSON (sin markdown):
{"title": "titulo corto 3-4 palabras", "description": "el desafío en una frase corta con emoji"}`
              },
              {
                role: "user",
                content: `Fecha: ${madridDate}. Día de la semana: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })}`
              }
            ],
            temperature: 0.9,
            max_tokens: 100,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            challengeTitle = parsed.title || "Desafío del día";
            challengeDescription = parsed.description || "";
          }
        }
      } catch (aiError) {
        console.error("AI generation failed, using fallback:", aiError);
      }
    }

    // Fallback: random challenge from predefined list
    if (!challengeDescription!) {
      const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
      const randomPrompt = randomTheme.prompts[Math.floor(Math.random() * randomTheme.prompts.length)];
      challengeDescription = randomPrompt;
      challengeTitle = randomTheme.category === "photo_fun" ? "Cara divertida" :
                       randomTheme.category === "creative" ? "Creatividad" :
                       randomTheme.category === "food" ? "Foodie" :
                       randomTheme.category === "pets" ? "Mascotas" :
                       randomTheme.category === "outdoor" ? "Naturaleza" : "En casa";
    }

    // Create the challenge
    const { data: challenge, error } = await supabase
      .from("challenges")
      .insert({
        challenge_date: madridDate,
        title: challengeTitle!,
        description: challengeDescription,
        is_active: true,
        generated_by: LOVABLE_API_KEY ? 'ai' : 'fallback',
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating challenge:", error);
      throw error;
    }

    // Assign rewards to the challenge (1st=epic, 2nd=rare, 3rd=common)
    const { data: stickers } = await supabase
      .from("stickers")
      .select("id, rarity")
      .eq("is_active", true);

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
        await supabase.from("challenge_rewards").insert(rewards);
      }
    }

    console.log("Challenge created:", challenge);

    return new Response(JSON.stringify({ 
      success: true, 
      challenge 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
