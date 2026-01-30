import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Hash token for comparison
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, child_user_id } = await req.json();

    if (!token || !child_user_id) {
      return new Response(
        JSON.stringify({ error: 'Token and child_user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the provided token
    const tokenHash = await hashToken(token);

    // Validate token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('tutor_access_tokens')
      .select('id, tutor_email, is_revoked')
      .eq('token_hash', tokenHash)
      .single();

    if (tokenError || !tokenRecord) {
      console.error('Token validation failed:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenRecord.is_revoked) {
      return new Response(
        JSON.stringify({ error: 'Token has been revoked', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get child profile
    const { data: childProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, nick, tutor_email, parent_approved, account_status')
      .eq('id', child_user_id)
      .single();

    if (profileError || !childProfile) {
      console.error('Child profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Child profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify that the token's tutor_email matches the child's tutor_email
    if (childProfile.tutor_email.toLowerCase() !== tokenRecord.tutor_email.toLowerCase()) {
      console.error('Tutor email mismatch:', {
        childTutor: childProfile.tutor_email,
        tokenTutor: tokenRecord.tutor_email
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: tutor email mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already approved
    if (childProfile.parent_approved && childProfile.account_status === 'active') {
      return new Response(
        JSON.stringify({ ok: true, already_approved: true, child_nick: childProfile.nick }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Approve the child
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        parent_approved: true,
        account_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', child_user_id);

    if (updateError) {
      console.error('Error approving child:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to approve child' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create tutor_child_link for historical tracking
    await supabase
      .from('tutor_child_links')
      .upsert({
        tutor_email: tokenRecord.tutor_email,
        child_user_id: child_user_id
      }, {
        onConflict: 'tutor_email,child_user_id'
      });

    // Update token last_used_at
    await supabase
      .from('tutor_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // Log approval in tutor_notifications
    await supabase
      .from('tutor_notifications')
      .insert({
        user_id: child_user_id,
        tutor_email: tokenRecord.tutor_email,
        type: 'approval_granted',
        status: 'completed',
        payload: { child_nick: childProfile.nick }
      });

    console.log('Child approved successfully:', { child_user_id, nick: childProfile.nick });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        approved: true, 
        child_nick: childProfile.nick 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in parent-approve-child:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
