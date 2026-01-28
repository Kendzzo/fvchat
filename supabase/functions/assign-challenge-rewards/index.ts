import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get yesterday's date in Madrid timezone
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toLocaleDateString('en-CA', { 
      timeZone: 'Europe/Madrid' 
    });

    console.log("Processing rewards for challenge date:", yesterdayDate);

    // Find yesterday's challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("id, rewards_assigned")
      .eq("challenge_date", yesterdayDate)
      .maybeSingle();

    if (challengeError) {
      console.error("Error fetching challenge:", challengeError);
      throw challengeError;
    }

    if (!challenge) {
      console.log("No challenge found for yesterday");
      return new Response(JSON.stringify({ 
        message: "No challenge found for yesterday" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (challenge.rewards_assigned) {
      console.log("Rewards already assigned for this challenge");
      return new Response(JSON.stringify({ 
        message: "Rewards already assigned" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get top 3 entries by likes
    const { data: topEntries, error: entriesError } = await supabase
      .from("challenge_entries")
      .select(`
        id,
        user_id,
        likes_count,
        user:profiles!challenge_entries_user_id_fkey(nick)
      `)
      .eq("challenge_id", challenge.id)
      .order("likes_count", { ascending: false })
      .limit(3);

    if (entriesError) {
      console.error("Error fetching entries:", entriesError);
      throw entriesError;
    }

    if (!topEntries || topEntries.length === 0) {
      console.log("No entries for this challenge");
      
      // Mark as processed anyway
      await supabase
        .from("challenges")
        .update({ rewards_assigned: true })
        .eq("id", challenge.id);

      return new Response(JSON.stringify({ 
        message: "No entries to reward" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get rewards for this challenge
    const { data: rewards } = await supabase
      .from("challenge_rewards")
      .select("position, reward_type, reward_id")
      .eq("challenge_id", challenge.id)
      .order("position");

    const winnersInserted = [];
    const stickersGranted = [];

    // Process each winner
    for (let i = 0; i < topEntries.length; i++) {
      const entry = topEntries[i];
      const position = i + 1;
      const reward = rewards?.find(r => r.position === position);

      // Insert winner record
      const { error: winnerError } = await supabase
        .from("challenge_winners")
        .insert({
          challenge_id: challenge.id,
          user_id: entry.user_id,
          entry_id: entry.id,
          position,
          likes_count: entry.likes_count,
          reward_granted: !!reward
        });

      if (winnerError && !winnerError.message.includes("duplicate")) {
        console.error("Error inserting winner:", winnerError);
      } else {
        const userProfile = entry.user as unknown as { nick: string } | null;
        winnersInserted.push({ position, user_id: entry.user_id, nick: userProfile?.nick || 'Unknown' });
      }

      // Grant sticker reward
      if (reward && reward.reward_type === 'sticker') {
        const { error: stickerError } = await supabase
          .from("user_stickers")
          .insert({
            user_id: entry.user_id,
            sticker_id: reward.reward_id,
            source: 'challenge'
          });

        if (stickerError && !stickerError.message.includes("duplicate")) {
          console.error("Error granting sticker:", stickerError);
        } else {
          stickersGranted.push({ position, user_id: entry.user_id });
        }
      }

      // Grant avatar item reward if configured
      if (reward && reward.reward_type === 'avatar_item') {
        const { error: itemError } = await supabase
          .from("user_inventory")
          .insert({
            user_id: entry.user_id,
            avatar_item_id: reward.reward_id,
            source: 'challenge'
          });

        if (itemError && !itemError.message.includes("duplicate")) {
          console.error("Error granting avatar item:", itemError);
        }
      }
    }

    // Mark challenge rewards as assigned
    await supabase
      .from("challenges")
      .update({ rewards_assigned: true })
      .eq("id", challenge.id);

    console.log("Rewards assigned:", { winnersInserted, stickersGranted });

    return new Response(JSON.stringify({ 
      success: true,
      challenge_id: challenge.id,
      winners: winnersInserted,
      stickers_granted: stickersGranted
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
