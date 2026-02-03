import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModerationRequest {
  text: string;
  surface: "chat" | "post" | "comment" | "nick" | "group_name";
  context?: string[]; // Previous messages for context (chat)
  targetUserId?: string; // For bullying detection
}

interface ModerationResult {
  allowed: boolean;
  categories: string[];
  severity: "low" | "medium" | "high" | null;
  reason: string;
}

// Layer 1: Local instant filter (no AI)
function localFilter(text: string): ModerationResult | null {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-_*+\s]+/g, " ")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");

  // Profanity patterns (ES/CAT/EN)
  const profanityPatterns = [
    /puta/gi,
    /puto/gi,
    /mierda/gi,
    /joder/gi,
    /cono/gi,
    /cojones/gi,
    /gilipollas/gi,
    /idiota/gi,
    /imbecil/gi,
    /subnormal/gi,
    /retrasado/gi,
    /maricon/gi,
    /marica/gi,
    /bollera/gi,
    /zorra/gi,
    /cabron/gi,
    /hijoputa/gi,
    /hijo\s*de\s*puta/gi,
    /hostia/gi,
    /mecagoen/gi,
    /me\s*cago\s*en/gi,
    /fuck/gi,
    /shit/gi,
    /bitch/gi,
    /asshole/gi,
    /dick/gi,
    /cock/gi,
    /gordo/gi,
    /gorda/gi,
    /feo/gi,
    /fea/gi,
    /tonto/gi,
    /estupido/gi,
    /perdedor/gi,
    /fracasado/gi,
    /inutil/gi,
  ];

  // Violence/threats
  const violencePatterns = [
    /te\s*mato/gi,
    /te\s*voy\s*a\s*matar/gi,
    /muere/gi,
    /suicidate/gi,
    /matate/gi,
    /kill\s*you/gi,
  ];

  // Sexual explicit
  const sexualPatterns = [/follar/gi, /sexo/gi, /porno/gi, /desnudo/gi, /naked/gi, /porn/gi];

  // Personal data patterns
  const personalDataPatterns = [
    /\b\d{9}\b/g, // Phone numbers (9 digits)
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Phone patterns
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // Emails
    /https?:\/\/[^\s]+/gi, // URLs
    /www\.[^\s]+/gi,
    /instagram|tiktok|snapchat|whatsapp/gi,
    /mi\s*numero\s*es/gi,
    /mi\s*telefono/gi,
    /mi\s*direccion/gi,
    /vivo\s*en/gi,
    /mi\s*casa\s*esta/gi,
  ];

  // Dangerous requests
  const dangerousPatterns = [
    /ven\s*a\s*verme/gi,
    /quedamos/gi,
    /pasame\s*tu\s*numero/gi,
    /dame\s*tu\s*(telefono|direccion|insta)/gi,
    /nos\s*vemos\s*en/gi,
    /te\s*recojo/gi,
  ];

  const categories: string[] = [];
  let severity: "low" | "medium" | "high" = "low";

  // Check profanity
  for (const pattern of profanityPatterns) {
    if (pattern.test(normalized)) {
      categories.push("profanity");
      severity = "medium";
      break;
    }
    pattern.lastIndex = 0;
  }

  // Check violence
  for (const pattern of violencePatterns) {
    if (pattern.test(normalized)) {
      categories.push("violence");
      severity = "high";
      break;
    }
    pattern.lastIndex = 0;
  }

  // Check sexual
  for (const pattern of sexualPatterns) {
    if (pattern.test(normalized)) {
      categories.push("sexual");
      severity = "high";
      break;
    }
    pattern.lastIndex = 0;
  }

  // Check personal data
  for (const pattern of personalDataPatterns) {
    if (pattern.test(text)) {
      // Use original text for data detection
      categories.push("personal_data");
      severity = "high";
      break;
    }
    pattern.lastIndex = 0;
  }

  // Check dangerous requests
  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalized)) {
      categories.push("dangerous_request");
      severity = "high";
      break;
    }
    pattern.lastIndex = 0;
  }

  if (categories.length > 0) {
    const reasons: Record<string, string> = {
      profanity: "Lenguaje no permitido",
      violence: "Contenido violento o amenazas",
      sexual: "Contenido sexual no permitido",
      personal_data: "No compartas datos personales",
      dangerous_request: "Solicitud potencialmente peligrosa",
    };

    return {
      allowed: false,
      categories,
      severity,
      reason: reasons[categories[0]] || "Contenido no permitido",
    };
  }

  return null; // Pass to Layer 2 (AI)
}

// Layer 2: AI moderation using Lovable AI with context
async function aiModeration(text: string, surface: string, context?: string[]): Promise<ModerationResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    console.log("[moderate-content] LOVABLE_API_KEY not configured, skipping AI moderation");
    return { allowed: true, categories: [], severity: null, reason: "" };
  }

  try {
    // Build context string for chat
    let contextInfo = "";
    if (context && context.length > 0 && surface === "chat") {
      contextInfo = `\n\nPrevious messages for context:\n${context
        .slice(-5)
        .map((m, i) => `${i + 1}. "${m}"`)
        .join("\n")}`;
    }

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
            content: `You are a content moderation AI for a children's social app (ages 6-16). 
Analyze the following message and determine if it should be blocked.

Block content that contains:
- Profanity, insults, or offensive language (in Spanish, Catalan, or English)
- Bullying, harassment, or humiliation (especially repeated patterns targeting the same person)
- Violence or threats
- Sexual content or innuendo
- Personal data (phone numbers, addresses, emails, social media handles)
- Dangerous requests (meeting in person, sharing location)
- Attempts to move conversation to other platforms (WhatsApp, Instagram, etc.)
- Persistent unwanted contact or spam-like behavior

Consider the CONTEXT of previous messages when evaluating chat content.
Look for patterns of bullying where the same sender repeatedly targets the same person.
${contextInfo}

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "allowed": boolean,
  "categories": ["profanity"|"bullying"|"violence"|"sexual"|"personal_data"|"dangerous_request"|"spam"|"platform_evasion"],
  "severity": "low"|"medium"|"high",
  "reason": "Brief explanation in Spanish, max 50 chars"
}

If the content is safe, respond with:
{"allowed": true, "categories": [], "severity": null, "reason": ""}`,
          },
          {
            role: "user",
            content: `Context: ${surface}\nMessage: "${text}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("[moderate-content] AI moderation request failed:", response.status);
      // Fail open for availability, but log for review
      return { allowed: true, categories: [], severity: null, reason: "" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        allowed: parsed.allowed ?? true,
        categories: parsed.categories || [],
        severity: parsed.severity || null,
        reason: parsed.reason || "",
      };
    }

    return { allowed: true, categories: [], severity: null, reason: "" };
  } catch (error) {
    console.error("[moderate-content] AI moderation error:", error);
    // Fail open for availability
    return { allowed: true, categories: [], severity: null, reason: "" };
  }
}

// Check for bullying patterns in recent history
async function checkBullyingPattern(
  adminClient: any,
  senderId: string,
  targetUserId?: string,
): Promise<{ isBullying: boolean; count: number }> {
  if (!targetUserId) return { isBullying: false, count: 0 };

  try {
    // Check blocked events from this sender to this target in last 7 days
    const { count } = await adminClient
      .from("moderation_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", senderId)
      .eq("allowed", false)
      .contains("categories", ["profanity", "bullying"])
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // If 3+ blocked insults in 7 days, flag as bullying pattern
    return {
      isBullying: (count || 0) >= 3,
      count: count || 0,
    };
  } catch (error) {
    console.error("[moderate-content] Bullying check error:", error);
    return { isBullying: false, count: 0 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[moderate-content] start");

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");

    // Parse request body FIRST (can only be read once)
    const body = await req.json();
    const {
      text,
      surface,
      context,
      targetUserId,
      userId: bodyUserId,
    } = body as ModerationRequest & { userId?: string };

    // Check if this is a service role call (internal server-to-server)
    const isServiceRoleCall = token === supabaseServiceKey;

    // Create service client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string;

    if (isServiceRoleCall) {
      // Internal call from another edge function - get userId from body
      if (!bodyUserId) {
        return new Response(JSON.stringify({ error: "userId required for internal calls" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = bodyUserId;
      console.log("[moderate-content] Internal service call for user:", userId.slice(0, 8) + "...");
    } else {
      // User call - validate JWT
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
      if (claimsError || !claimsData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.user.id;
    }

    // Check if user is suspended
    const { data: profile } = await adminClient
      .from("profiles")
      .select("suspended_until, tutor_email, nick")
      .eq("id", userId)
      .single();

    if (profile?.suspended_until && new Date(profile.suspended_until) > new Date()) {
      const suspendedUntil = new Date(profile.suspended_until);
      return new Response(
        JSON.stringify({
          allowed: false,
          suspended: true,
          suspended_until: profile.suspended_until,
          reason: `Cuenta bloqueada hasta ${suspendedUntil.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Invalid text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[moderate-content] surface:", surface, "text length:", text.length);

    // Layer 1: Local filter
    let result = localFilter(text);

    // Layer 2: AI moderation with context (if local filter passed)
    if (!result) {
      result = await aiModeration(text, surface, context);
    }

    // Additional: Check for bullying patterns
    if (result.allowed && surface === "chat" && targetUserId) {
      const bullyingCheck = await checkBullyingPattern(adminClient, userId, targetUserId);
      if (bullyingCheck.isBullying) {
        result = {
          allowed: false,
          categories: ["bullying"],
          severity: "high",
          reason: "Comportamiento inapropiado repetitivo detectado",
        };
      }
    }

    // Log moderation event ALWAYS (allowed or blocked)
    const textSnippet = text.length > 120 ? text.substring(0, 117) + "..." : text;

    await adminClient.from("moderation_events").insert({
      user_id: userId,
      surface,
      text_snippet: textSnippet,
      allowed: result.allowed,
      categories: result.categories,
      severity: result.severity,
      reason: result.reason,
    });

    // If content was blocked, check strikes
    if (!result.allowed) {
      // Count strikes in last 24 hours
      const { count } = await adminClient
        .from("moderation_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("allowed", false)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const strikeCount = count || 0;

      // If 3+ strikes, suspend for 24 hours
      if (strikeCount >= 3) {
        const suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await adminClient.from("profiles").update({ suspended_until: suspendedUntil.toISOString() }).eq("id", userId);

        // Queue tutor notification
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
            },
          });
        }

        console.log("[moderate-content] User suspended:", userId);

        return new Response(
          JSON.stringify({
            allowed: false,
            suspended: true,
            suspended_until: suspendedUntil.toISOString(),
            reason: result.reason,
            categories: result.categories,
            severity: result.severity,
            strikes: strikeCount,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          allowed: false,
          suspended: false,
          reason: result.reason,
          categories: result.categories,
          severity: result.severity,
          strikes: strikeCount,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[moderate-content] allowed");

    return new Response(
      JSON.stringify({
        allowed: true,
        suspended: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[moderate-content] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
