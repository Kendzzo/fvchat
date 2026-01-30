import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModerationResult {
  allowed: boolean;
  categories: string[];
  severity: "low" | "medium" | "high" | null;
  reason: string;
  detectedText?: string;
}

/**
 * Moderate Image Edge Function
 * Uses Google Gemini Vision to analyze images for inappropriate content
 * 
 * Detects:
 * - Nudity/sexualization
 * - Violence (weapons, blood, fights)
 * - Self-harm imagery
 * - Obscene gestures
 * - Visual bullying
 * - Offensive text in images (OCR)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[moderate-image] start");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.log("[moderate-image] LOVABLE_API_KEY not configured - fail open");
      return new Response(JSON.stringify({ 
        allowed: true, 
        categories: [], 
        severity: null, 
        reason: "",
        fallback: true 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth token (optional for internal calls)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      userId = userData.user?.id || null;
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { 
      imageUrl, 
      imageBase64, 
      surface = "post",  // post | chat | profile | sticker | challenge
      checkText = true   // Also run text moderation on any detected text
    } = body;

    if (!imageUrl && !imageBase64) {
      return new Response(JSON.stringify({ error: "imageUrl or imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[moderate-image] analyzing image for surface:", surface);

    // Build the image content for Gemini
    let imageContent: { type: string; image_url?: { url: string }; text?: string };
    
    if (imageBase64) {
      imageContent = {
        type: "image_url",
        image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` }
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: { url: imageUrl }
      };
    }

    // Call Gemini Vision for content moderation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a strict content moderation AI for a children's social app (ages 6-16).
Analyze this image and determine if it should be BLOCKED.

BLOCK the image if it contains ANY of:
- Nudity, partial nudity, sexualized content, suggestive poses
- Violence: weapons (guns, knives), blood, fighting, gore
- Self-harm imagery: cuts, injuries shown intentionally
- Obscene gestures: middle finger, sexual gestures
- Bullying visual content: humiliating images, mockery
- Scary/horror content: creepy faces, monsters designed to frighten
- Drug or alcohol references
- Offensive text visible in the image (profanity, slurs, threats)

ALLOW safe content like:
- Normal selfies and portraits
- Gaming screenshots (no violence)
- Nature, animals, food
- Art and drawings (kid-friendly)
- Text that is neutral/positive

IMPORTANT: Also extract ANY text visible in the image (OCR) for secondary moderation.

Respond ONLY with valid JSON (no markdown):
{
  "allowed": boolean,
  "categories": ["nudity"|"violence"|"self_harm"|"obscene"|"bullying"|"horror"|"drugs"|"offensive_text"],
  "severity": "low"|"medium"|"high",
  "reason": "Brief explanation in Spanish, max 50 chars",
  "detectedText": "Any text found in the image, empty string if none"
}

If the image is safe:
{"allowed": true, "categories": [], "severity": null, "reason": "", "detectedText": ""}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this ${surface} image for a children's app:` },
              imageContent
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[moderate-image] AI Gateway error:", aiResponse.status, errorText);
      
      // Fail open for availability but log
      return new Response(JSON.stringify({ 
        allowed: true, 
        categories: [], 
        severity: null, 
        reason: "",
        fallback: true,
        error: "AI service temporarily unavailable"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    console.log("[moderate-image] AI response received");

    // Parse JSON response
    let result: ModerationResult = { 
      allowed: true, 
      categories: [], 
      severity: null, 
      reason: "" 
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          allowed: parsed.allowed ?? true,
          categories: parsed.categories || [],
          severity: parsed.severity || null,
          reason: parsed.reason || "",
          detectedText: parsed.detectedText || ""
        };
      }
    } catch (parseError) {
      console.error("[moderate-image] Failed to parse AI response:", parseError);
    }

    // If text was detected and checkText is enabled, run text moderation
    if (checkText && result.detectedText && result.detectedText.trim()) {
      console.log("[moderate-image] Running text moderation on detected text");
      
      // Use the existing moderate-content function logic inline
      const textResult = await moderateTextInline(result.detectedText, lovableApiKey);
      
      if (!textResult.allowed) {
        result.allowed = false;
        result.categories = [...new Set([...result.categories, ...textResult.categories])];
        result.severity = textResult.severity === "high" ? "high" : result.severity;
        result.reason = textResult.reason || result.reason;
      }
    }

    // Log moderation event if user is authenticated
    if (userId) {
      const snippet = imageUrl ? imageUrl.substring(0, 100) : "[base64 image]";
      
      await adminClient.from("moderation_events").insert({
        user_id: userId,
        surface: `image_${surface}`,
        text_snippet: snippet,
        allowed: result.allowed,
        categories: result.categories,
        severity: result.severity,
        reason: result.reason,
      });

      // Handle strikes if blocked
      if (!result.allowed) {
        const { count } = await adminClient
          .from("moderation_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("allowed", false)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const strikeCount = count || 0;

        if (strikeCount >= 3) {
          const suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
          
          await adminClient
            .from("profiles")
            .update({ suspended_until: suspendedUntil.toISOString() })
            .eq("id", userId);

          // Get tutor email for notification
          const { data: profile } = await adminClient
            .from("profiles")
            .select("tutor_email, nick")
            .eq("id", userId)
            .single();

          if (profile?.tutor_email) {
            await adminClient.from("tutor_notifications").insert({
              tutor_email: profile.tutor_email,
              user_id: userId,
              type: "suspension",
              status: "queued",
              payload: {
                nick: profile.nick,
                strike_count: strikeCount,
                suspended_until: suspendedUntil.toISOString(),
                reason: result.reason,
                trigger: "image_moderation",
              },
            });
          }

          console.log("[moderate-image] User suspended:", userId);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[moderate-image] completed in ${duration}ms, allowed: ${result.allowed}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[moderate-image] Error:", error);
    
    // Fail open for availability
    return new Response(JSON.stringify({ 
      allowed: true, 
      categories: [], 
      severity: null, 
      reason: "",
      fallback: true,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Inline text moderation (reuses moderate-content logic)
 */
async function moderateTextInline(text: string, apiKey: string): Promise<ModerationResult> {
  // Local filter first
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\-_*+\s]+/g, ' ')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');

  const profanityPatterns = [
    /puta/gi, /puto/gi, /mierda/gi, /joder/gi, /cono/gi, /cojones/gi,
    /gilipollas/gi, /idiota/gi, /imbecil/gi, /subnormal/gi, /retrasado/gi,
    /maricon/gi, /marica/gi, /bollera/gi, /zorra/gi, /cabron/gi,
    /hijoputa/gi, /hostia/gi, /fuck/gi, /shit/gi, /bitch/gi,
  ];

  for (const pattern of profanityPatterns) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        categories: ["profanity"],
        severity: "medium",
        reason: "Texto ofensivo detectado en imagen",
      };
    }
    pattern.lastIndex = 0;
  }

  return { allowed: true, categories: [], severity: null, reason: "" };
}
