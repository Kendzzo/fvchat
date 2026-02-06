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
  // CORS
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ✅ 1) Validar usuario con token REAL (seguridad)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // ✅ 2) Leer body
    const body: SendMessageRequest = await req.json();
    const { chat_id, client_temp_id, content_type, content_text, content_url, sticker_id } = body;

    if (!chat_id || !client_temp_id || !content_type) {
      return new Response(JSON.stringify({ ok: false, error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ 3) Cliente ADMIN para DB (evita que RLS rompa envíos y “desaparezca” el mensaje)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ✅ 4) Verificar chat + participante (con ADMIN para no depender de RLS)
    const { data: chatData, error: chatError } = await supabaseAdmin
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

    // ✅ 5) Comprobar suspensión / bloqueo (ADMIN)
    const { data: profileData } = await supabaseAdmin
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

    const suspendedUntilRaw = (profileData as any)?.suspended_until as string | null;
    if (suspendedUntilRaw && new Date(suspendedUntilRaw) > new Date()) {
      return new Response(JSON.stringify({ ok: false, error: "Tu cuenta está suspendida temporalmente" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ 6) Determinar content
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

    // ✅ 7) MAPEO CRÍTICO: evitar que “photo” reviente el enum de DB
    // - sticker -> image
    // - photo -> image
    // - image -> image
    // - audio/video/text 그대로
    const dbType: "text" | "image" | "audio" | "video" =
      content_type === "sticker" || content_type === "photo" || content_type === "image" ? "image" : content_type;

    // ✅ 8) Insertar mensaje (ADMIN)
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

    const { data: messageData, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert(insertData)
      .select("id, chat_id, sender_id, content, type, status, sticker_id, client_temp_id, is_blocked, created_at")
      .single();

    if (insertError || !messageData) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Error al guardar mensaje",
          details: insertError?.message,
          code: (insertError as any)?.code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ✅ 9) Moderación ASYNC SOLO para texto (con SERVICE ROLE) + si bloquea, marcar mensaje bloqueado
    if (content_type === "text" && content) {
      void (async () => {
        try {
          const modRes = await fetch(`${supabaseUrl}/functions/v1/moderate-content`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // IMPORTANTE: service role para que moderate-content pueda actualizar strikes/suspensión sin depender de RLS
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              text: content,
              surface: "chat",
              userId, // required para internal service call
              messageId: (messageData as any).id,
              chat_id,
            }),
          });

          if (!modRes.ok) return;

          const mod = await modRes.json();

          if (mod && mod.allowed === false) {
            await supabaseAdmin
              .from("messages")
              .update({
                status: "blocked",
                is_blocked: true,
                moderation_reason: mod.reason || "Contenido no permitido",
                moderation_checked_at: new Date().toISOString(),
              })
              .eq("id", (messageData as any).id);
          } else {
            await supabaseAdmin
              .from("messages")
              .update({
                moderation_checked_at: new Date().toISOString(),
              })
              .eq("id", (messageData as any).id);
          }
        } catch {
          // fail-open (no tocar nada)
        }
      })();
    }

    // ✅ 10) Respuesta OK
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
