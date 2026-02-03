import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MINIMUM_STICKERS_REQUIRED = 10;
const STICKERS_TO_ASSIGN = 5;

serve(async (req) => {
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
        JSON.stringify({ ok: false, error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[assign-starter-stickers] Processing user: ${user_id}`);

    // CRITICAL: Check if profile exists before doing anything
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .maybeSingle();

    if (profileError) {
      console.error("[assign-starter-stickers] Error checking profile:", profileError);
      throw profileError;
    }

    if (!profile) {
      console.log(`[assign-starter-stickers] Profile not found for user ${user_id}, skipping`);
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "profile_not_found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has stickers
    const { count: userStickerCount, error: countError } = await supabase
      .from("user_stickers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (countError) {
      console.error("[assign-starter-stickers] Error counting user stickers:", countError);
      throw countError;
    }

    if (userStickerCount && userStickerCount > 0) {
      console.log(`[assign-starter-stickers] User already has ${userStickerCount} stickers, skipping`);
      return new Response(
        JSON.stringify({ ok: true, alreadyGranted: true, count: userStickerCount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if catalog has enough stickers
    const { data: catalogStickers, error: catalogError } = await supabase
      .from("stickers")
      .select("id, rarity")
      .order("created_at", { ascending: false });

    if (catalogError) {
      console.error("[assign-starter-stickers] Error fetching catalog:", catalogError);
      throw catalogError;
    }

    const catalogCount = catalogStickers?.length || 0;
    console.log(`[assign-starter-stickers] Catalog has ${catalogCount} stickers`);

    // If not enough stickers, trigger seed
    if (catalogCount < MINIMUM_STICKERS_REQUIRED) {
      console.log("[assign-starter-stickers] Not enough stickers, triggering seed...");
      
      try {
        const seedResponse = await fetch(
          `${supabaseUrl}/functions/v1/seed-stickers`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ count: 20 }),
          }
        );

        if (!seedResponse.ok) {
          const errorText = await seedResponse.text();
          console.error("[assign-starter-stickers] Seed failed:", errorText);
          // Continue anyway - we might still have some stickers
        } else {
          const seedResult = await seedResponse.json();
          console.log("[assign-starter-stickers] Seed result:", seedResult);
        }

        // Re-fetch catalog after seeding
        const { data: newCatalog } = await supabase
          .from("stickers")
          .select("id, rarity")
          .order("created_at", { ascending: false });

        if (newCatalog && newCatalog.length > 0) {
          catalogStickers!.length = 0;
          catalogStickers!.push(...newCatalog);
        }
      } catch (seedError) {
        console.error("[assign-starter-stickers] Error during seed:", seedError);
        // Continue - we'll use whatever stickers we have
      }
    }

    // Get final sticker count
    const availableStickers = catalogStickers || [];
    if (availableStickers.length === 0) {
      console.log("[assign-starter-stickers] No stickers available after seed attempt");
      return new Response(
        JSON.stringify({ ok: true, assigned: 0, reason: "no_stickers_available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Weight selection by rarity (common = 3, rare = 2, epic = 1)
    const weightedStickers: string[] = [];
    for (const sticker of availableStickers) {
      const weight = sticker.rarity === "epic" ? 1 : sticker.rarity === "rare" ? 2 : 3;
      for (let i = 0; i < weight; i++) {
        weightedStickers.push(sticker.id);
      }
    }

    // Shuffle and pick unique stickers
    const shuffled = weightedStickers.sort(() => Math.random() - 0.5);
    const selectedIds = new Set<string>();
    for (const id of shuffled) {
      if (selectedIds.size >= STICKERS_TO_ASSIGN) break;
      selectedIds.add(id);
    }

    // If we don't have enough unique stickers, just use what we have
    if (selectedIds.size < STICKERS_TO_ASSIGN && availableStickers.length > 0) {
      for (const sticker of availableStickers) {
        if (selectedIds.size >= STICKERS_TO_ASSIGN) break;
        selectedIds.add(sticker.id);
      }
    }

    const stickerIdsArray = Array.from(selectedIds);
    console.log(`[assign-starter-stickers] Selected ${stickerIdsArray.length} stickers for user`);

    // Insert user_stickers
    const insertData = stickerIdsArray.map((sticker_id) => ({
      user_id,
      sticker_id,
      source: "signup_gift",
    }));

    const { error: insertError } = await supabase
      .from("user_stickers")
      .insert(insertData);

    if (insertError) {
      console.error("[assign-starter-stickers] Error inserting user_stickers:", insertError);
      throw insertError;
    }

    console.log(`[assign-starter-stickers] Successfully assigned ${stickerIdsArray.length} stickers to ${user_id}`);

    return new Response(
      JSON.stringify({
        ok: true,
        assigned: stickerIdsArray.length,
        stickerIds: stickerIdsArray,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[assign-starter-stickers] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
