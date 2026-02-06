import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendMessageRequest {
  chat_id: string;
  client_temp_id: string;
  content_type: "text" | "image" | "audio" | "sticker" | "photo" | "video";
  content_text?: string;
  content_url?: string;
  sticker_id?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // IMPORTANT: Use the USER token for EVERYTHING (no service role, no bypass)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const body: SendMessageRequest = await req.json();
    const { chat_id, client_temp_id, content_type, content_text, content_url, sticker_id } = body;

    if (!chat_id || !client_temp_id || !content_type) {
      return new Response(JSON.stringify({ ok: false, error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify chat exists + user is participant (must be allowed by chats RLS)
    const { data: chatData, error: chatError } = await supabase
      .from("chats")
      .select("id, participant_ids")
      .eq("id", chat_id)
      .single();

    if (chatError || !chatData) {
      return new Response(JSON.stringify({ ok: false, error: "Chat no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const participantIds = (chatData as any).participant_ids as string[] | null;
    if (!Array.isArray(participantIds) || !participantIds.includes(userId)) {
      return new Response(JSON.stringify({ ok: false, error: "No eres participante de este chat" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check block/suspension (must be allowed by profiles RLS)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("language_infractions_count, suspended_until")
      .eq("id", userId)
      .single();

    if ((profileData as any)?.language_infractions_count >= 5) {
      return new Response(JSON.stringify({ ok: false, error: "Tu cuenta está restringida" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((profileData as any)?.suspended_until && new Date((profileData as any).suspended_until) > new Date()) {
      return new Response(JSON.stringify({ ok: false, error: "Tu cuenta está suspendida temporalmente" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine content
    let content = "";
    if (content_type === "text") {
      content = (content_text || "").trim();
      if (!content) {
        return new Response(JSON.stringify({ ok: false, error: "Mensaje vacío" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      content = content_url || "";
      if (!content) {
        return new Response(JSON.stringify({ ok: false, error: "URL de contenido requerida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Map type
    // Stickers are stored as image + sticker_id
    const dbType = content_type === "sticker" ? "image" : content_type;

    // Insert using USER client so RLS works correctly and doesn't break writes
    const insertData = {
      chat_id,
      sender_id: userId,
      content,
      type: dbType,
      status: "sent",
      sticker_id: sticker_id || null,
      client_temp_id,
      is_blocked: false,
    };

    const { data: messageData, error: insertError } = await supabase
      .from("messages")
      .insert(insertData)
      .select("id, chat_id, sender_id, content, type, status, sticker_id, client_temp_id, is_blocked, created_at")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Error al guardar mensaje",
          details: insertError.message,
          code: insertError.code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire async moderation for text (non-blocking)
    if (content_type === "text" && content.trim()) {
      void (async () => {
        try {
          await fetch(`${supabaseUrl}/functions/v1/moderate-content`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader, // IMPORTANT: user token, not service role
            },
            body: JSON.stringify({
              text: content,
              surface: "chat",
              userId,
              messageId: (messageData as any).id,
            }),
          });
        } catch {
          // fail-open (no-op)
        }
      })();
    }

    return new Response(JSON.stringify({ ok: true, message: messageData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
