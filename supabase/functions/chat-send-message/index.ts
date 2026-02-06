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
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) Validar usuario con su token
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const body: SendMessageRequest = await req.json();
    const { chat_id, client_temp_id, content_type, content_text, content_url, sticker_id } = body;

    if (!chat_id || !client_temp_id || !content_type) {
      return new Response(JSON.stringify({ ok: false, error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Admin para DB (insert seguro)
    const admin = createClient(supabaseUrl, serviceKey);

    // 3) Verificar participante del chat
    const { data: chat, error: chatErr } = await admin
      .from("chats")
      .select("id, participant_ids")
      .eq("id", chat_id)
      .single();

    if (chatErr || !chat) {
      return new Response(JSON.stringify({ ok: false, error: "Chat no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const participants = (chat as any).participant_ids as string[] | null;
    if (!Array.isArray(participants) || !participants.includes(userId)) {
      return new Response(JSON.stringify({ ok: false, error: "No eres participante de este chat" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Construir content
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
      content = (content_url || "").trim();
      if (!content) {
        return new Response(JSON.stringify({ ok: false, error: "URL de contenido requerida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const dbType = content_type === "sticker" ? "image" : content_type;

    // 5) INSERT (admin)
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

    const { data: message, error: insErr } = await admin
      .from("messages")
      .insert(insertData)
      .select("id, chat_id, sender_id, content, type, status, sticker_id, client_temp_id, is_blocked, created_at")
      .single();

    if (insErr) {
      return new Response(
        JSON.stringify({ ok: false, error: "Error al guardar mensaje", details: insErr.message, code: insErr.code }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "Error interno", details: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
