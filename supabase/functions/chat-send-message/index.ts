import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  console.log("[chat-send-message] Request received:", req.method);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[chat-send-message] No auth header");
      return new Response(
        JSON.stringify({ ok: false, error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token for auth validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("[chat-send-message] Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ ok: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("[chat-send-message] User authenticated:", userId.slice(0, 8) + "...");

    // Parse request body
    const body: SendMessageRequest = await req.json();
    const { chat_id, client_temp_id, content_type, content_text, content_url, sticker_id } = body;

    console.log("[chat-send-message] Request body:", {
      chat_id: chat_id?.slice(0, 8) + "...",
      content_type,
      client_temp_id: client_temp_id?.slice(0, 15) + "...",
      has_text: !!content_text,
      has_url: !!content_url,
      has_sticker: !!sticker_id,
    });

    // Validate required fields
    if (!chat_id || !client_temp_id || !content_type) {
      console.error("[chat-send-message] Missing required fields");
      return new Response(
        JSON.stringify({ ok: false, error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine content based on type
    let content = "";
    if (content_type === "text") {
      content = content_text || "";
      if (!content.trim()) {
        return new Response(
          JSON.stringify({ ok: false, error: "Mensaje vacío" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (content_type === "sticker" || content_type === "image" || content_type === "audio" || content_type === "photo" || content_type === "video") {
      content = content_url || "";
      if (!content) {
        return new Response(
          JSON.stringify({ ok: false, error: "URL de contenido requerida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use service role client for DB operations (bypasses RLS for verification)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Verify user is participant in this chat
    const { data: chatData, error: chatError } = await supabaseAdmin
      .from("chats")
      .select("id, participant_ids")
      .eq("id", chat_id)
      .single();

    if (chatError || !chatData) {
      console.error("[chat-send-message] Chat not found:", chatError?.message);
      return new Response(
        JSON.stringify({ ok: false, error: "Chat no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!chatData.participant_ids.includes(userId)) {
      console.error("[chat-send-message] User not participant in chat");
      return new Response(
        JSON.stringify({ ok: false, error: "No eres participante de este chat" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is blocked
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("language_infractions_count, suspended_until")
      .eq("id", userId)
      .single();

    if (profileData?.language_infractions_count && profileData.language_infractions_count >= 5) {
      console.error("[chat-send-message] User is blocked");
      return new Response(
        JSON.stringify({ ok: false, error: "Tu cuenta está restringida" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profileData?.suspended_until && new Date(profileData.suspended_until) > new Date()) {
      console.error("[chat-send-message] User is suspended");
      return new Response(
        JSON.stringify({ ok: false, error: "Tu cuenta está suspendida temporalmente" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map content_type to DB enum value
    let dbContentType = content_type;
    if (content_type === "sticker") {
      dbContentType = "image"; // stickers are stored as image type with sticker_id
    }

    // INSERT MESSAGE - This is the critical part
    console.log("[chat-send-message] Inserting message into DB...");
    const insertData = {
      chat_id,
      sender_id: userId,
      content,
      type: dbContentType,
      status: "sent", // Direct send, moderation is async post-send
      sticker_id: sticker_id || null,
      client_temp_id,
      is_blocked: false,
    };

    const { data: messageData, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert(insertData)
      .select(`
        id,
        chat_id,
        sender_id,
        content,
        type,
        status,
        sticker_id,
        client_temp_id,
        is_blocked,
        created_at
      `)
      .single();

    if (insertError) {
      console.error("[chat-send-message] INSERT FAILED:", insertError.message, insertError.code);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Error al guardar mensaje", 
          details: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[chat-send-message] INSERT SUCCESS:", messageData.id);

    // Fire async moderation (non-blocking) for text messages
    // We use void Promise pattern instead of EdgeRuntime.waitUntil for compatibility
    if (content_type === "text" && content.trim()) {
      void (async () => {
        try {
          console.log("[chat-send-message] Starting async moderation for:", messageData.id);
          
          // Call moderate-content function
          const moderateResponse = await fetch(
            `${supabaseUrl}/functions/v1/moderate-content`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                text: content,
                surface: "chat",
                userId: userId,
                messageId: messageData.id,
              }),
            }
          );

          if (moderateResponse.ok) {
            const modResult = await moderateResponse.json();
            console.log("[chat-send-message] Moderation result:", modResult.allowed);

            if (!modResult.allowed) {
              // Update message status to blocked
              await supabaseAdmin
                .from("messages")
                .update({
                  status: "blocked",
                  moderation_reason: modResult.reason || "Contenido no permitido",
                  moderation_checked_at: new Date().toISOString(),
                  is_blocked: true,
                })
                .eq("id", messageData.id);

              console.log("[chat-send-message] Message blocked:", messageData.id);
            } else {
              // Mark as checked
              await supabaseAdmin
                .from("messages")
                .update({
                  moderation_checked_at: new Date().toISOString(),
                })
                .eq("id", messageData.id);
            }
          } else {
            console.error("[chat-send-message] Moderation call failed:", moderateResponse.status);
          }
        } catch (modError) {
          console.error("[chat-send-message] Moderation error (non-blocking):", modError);
          // Fail open - message stays sent
        }
      })();
    }

    // Return success with the created message
    return new Response(
      JSON.stringify({
        ok: true,
        message: messageData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[chat-send-message] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
