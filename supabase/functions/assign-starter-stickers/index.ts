import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[assign-starter-stickers] Checking user: ${user_id}`);

    // Check if user already has stickers
    const { count, error: countError } = await supabase
      .from("user_stickers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (countError) {
      console.error("[assign-starter-stickers] Error counting stickers:", countError);
      throw countError;
    }

    if (count && count > 0) {
      console.log(`[assign-starter-stickers] User already has ${count} stickers, skipping`);
      return new Response(
        JSON.stringify({ ok: true, already: true, count }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get 10 random stickers from the catalog
    const { data: randomStickers, error: stickersError } = await supabase
      .from("stickers")
      .select("id")
      .order("id") // We'll randomize in JS since Supabase doesn't have easy random
      .limit(100);

    if (stickersError) {
      console.error("[assign-starter-stickers] Error fetching stickers:", stickersError);
      throw stickersError;
    }

    if (!randomStickers || randomStickers.length === 0) {
      console.log("[assign-starter-stickers] No stickers available in catalog");
      return new Response(
        JSON.stringify({ ok: true, assigned: 0, reason: "no_stickers_available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Shuffle and pick up to 10
    const shuffled = randomStickers.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));

    console.log(`[assign-starter-stickers] Assigning ${selected.length} stickers to user`);

    // Insert the stickers for the user
    const insertData = selected.map((s) => ({
      user_id,
      sticker_id: s.id,
      source: "starter",
    }));

    const { error: insertError } = await supabase
      .from("user_stickers")
      .insert(insertData);

    if (insertError) {
      console.error("[assign-starter-stickers] Error inserting stickers:", insertError);
      throw insertError;
    }

    console.log(`[assign-starter-stickers] Successfully assigned ${selected.length} stickers`);

    return new Response(
      JSON.stringify({ ok: true, assigned: selected.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[assign-starter-stickers] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
