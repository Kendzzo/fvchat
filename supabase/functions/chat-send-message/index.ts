import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ContentType = "text" | "image" | "audio" | "sticker" | "photo" | "video";

interface SendMessageRequest {
  chat_id: string;
  client_temp_id: string;
  content_type: ContentType;
  content_text?: string;
  content_url?: string;
  sticker_id?: string;
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Método no permitido" });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { ok: false, error: "No autorizado" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // USER client: todo bajo RLS real
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1) Validar usuario real
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json(401, { ok: false, error: "Token inválido" });

    const body = (await req.json()) as SendMessageRequest;
    const { chat_id, client_temp_id, content_type, content_text, content_url, sticker_id } = body;

    if (!chat_id || !client_temp_id || !content_type) {
      return json(400, { ok: false, error: "Faltan campos requeridos" });
    }

    // 2) Validar contenido
    let content = "";
    if (content_type === "text") {
      content = (content_text || "").trim();
      if (!content) return json(400, { ok: false, error: "Mensaje vacío" });
    } else {
      content = (content_url || "").trim();
      if (!content) return json(400, { ok: false, error: "URL de contenido requerida" });
    }

    const dbType = content_type === "sticker" ? "image" : content_type;

    // 3) Insert DB (si falla, NO ok)
    const insertData = {
      chat_id,
      sender_id: user.id,
      content,
      type: dbType,
      status: "sent",
      sticker_id: sticker_id || null,
      client_temp_id,
      is_blocked: false,
    };

    const { data: messageData, error: insertErr } = await supabase
      .from("messages")
      .insert(insertData)
      .select("id, chat_id, sender_id, content, type, status, sticker_id, client_temp_id, is_blocked, created_at")
      .single();

    if (insertErr || !messageData) {
      return json(400, {
        ok: false,
        error: "Error al guardar mensaje",
        details: insertErr?.message || "insert_failed",
        code: insertErr?.code || null,
      });
    }

    // 4) Moderación async SOLO texto (fail-open) — NO afecta respuesta
    if (content_type === "text") {
      void (async () => {
        try {
          await fetch(`${supabaseUrl}/functions/v1/moderate-content`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            body: JSON.stringify({
              text: content,
              surface: "chat",
              userId: user.id,
              messageId: messageData.id,
            }),
          });
        } catch {
          // no-op
        }
      })();
    }

    // 5) Respuesta OK real
    return json(200, { ok: true, message: messageData });
  } catch (e) {
    return json(500, { ok: false, error: "Error interno", details: e instanceof Error ? e.message : String(e) });
  }
});
