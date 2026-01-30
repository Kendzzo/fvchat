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
    const { token, child_user_id, chat_id, messages_page = 0 } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
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

    // Update token last_used_at
    await supabase
      .from('tutor_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    const tutorEmail = tokenRecord.tutor_email;

    // If chat_id is provided, get messages for that chat
    if (chat_id && child_user_id) {
      // Verify child belongs to this tutor
      const { data: childProfile } = await supabase
        .from('profiles')
        .select('id, tutor_email')
        .eq('id', child_user_id)
        .single();

      if (!childProfile || childProfile.tutor_email.toLowerCase() !== tutorEmail.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to this child' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get messages for the chat (paginated, 50 per page)
      const pageSize = 50;
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          type,
          created_at,
          sender_id,
          is_blocked,
          sticker:stickers(id, name, image_url)
        `)
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: false })
        .range(messages_page * pageSize, (messages_page + 1) * pageSize - 1);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      // Get sender profiles for the messages
      const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('id, nick, profile_photo_url')
        .in('id', senderIds);

      const senderMap = new Map((senderProfiles || []).map(p => [p.id, p]));

      const messagesWithSenders = (messages || []).map(m => ({
        ...m,
        sender: senderMap.get(m.sender_id) || { nick: 'Unknown' }
      }));

      return new Response(
        JSON.stringify({ 
          ok: true, 
          messages: messagesWithSenders,
          has_more: (messages || []).length === pageSize
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If child_user_id is provided, get detailed data for that child
    if (child_user_id) {
      // Verify child belongs to this tutor
      const { data: childProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nick, birth_year, age_group, tutor_email, parent_approved, account_status, profile_photo_url, created_at')
        .eq('id', child_user_id)
        .single();

      if (profileError || !childProfile) {
        return new Response(
          JSON.stringify({ error: 'Child not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (childProfile.tutor_email.toLowerCase() !== tutorEmail.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to this child' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get child's posts (last 50)
      const { data: posts } = await supabase
        .from('posts')
        .select('id, text, type, content_url, privacy, likes_count, created_at, is_challenge_entry')
        .eq('author_id', child_user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get child's comments (last 100)
      const { data: comments } = await supabase
        .from('comments')
        .select(`
          id,
          text,
          created_at,
          post_id
        `)
        .eq('author_id', child_user_id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Get posts for these comments
      const postIds = [...new Set((comments || []).map(c => c.post_id))];
      const { data: commentPosts } = await supabase
        .from('posts')
        .select('id, text, author_id')
        .in('id', postIds);

      const postMap = new Map((commentPosts || []).map(p => [p.id, p]));

      // Get comment post authors
      const commentPostAuthorIds = [...new Set((commentPosts || [])
        .filter(p => p.author_id)
        .map(p => p.author_id))];
      
      const { data: commentPostAuthors } = await supabase
        .from('profiles')
        .select('id, nick')
        .in('id', commentPostAuthorIds.length > 0 ? commentPostAuthorIds : ['00000000-0000-0000-0000-000000000000']);

      const authorMap = new Map((commentPostAuthors || []).map(a => [a.id, a]));

      const commentsWithAuthors = (comments || []).map(c => {
        const post = postMap.get(c.post_id);
        return {
          ...c,
          post: post || null,
          post_author: post?.author_id ? authorMap.get(post.author_id) : null
        };
      });

      // Get child's chats (last 50)
      const { data: chats } = await supabase
        .from('chats')
        .select('id, name, is_group, participant_ids, created_at')
        .contains('participant_ids', [child_user_id])
        .order('created_at', { ascending: false })
        .limit(50);

      // Get participant profiles for chats
      const allParticipantIds = [...new Set((chats || []).flatMap(c => c.participant_ids))];
      const { data: participants } = await supabase
        .from('profiles')
        .select('id, nick, profile_photo_url')
        .in('id', allParticipantIds);

      const participantMap = new Map((participants || []).map(p => [p.id, p]));

      // Get last message for each chat
      const chatIds = (chats || []).map(c => c.id);
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('id, chat_id, content, created_at, sender_id')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false });

      // Group by chat and take first (most recent)
      const lastMessageMap = new Map();
      (lastMessages || []).forEach(m => {
        if (!lastMessageMap.has(m.chat_id)) {
          lastMessageMap.set(m.chat_id, m);
        }
      });

      const chatsWithDetails = (chats || []).map(chat => ({
        ...chat,
        participants: chat.participant_ids.map((id: string) => participantMap.get(id)).filter(Boolean),
        last_message: lastMessageMap.get(chat.id) || null
      }));

      return new Response(
        JSON.stringify({
          ok: true,
          child: childProfile,
          posts: posts || [],
          comments: commentsWithAuthors || [],
          chats: chatsWithDetails || []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: List all children for this tutor
    const { data: children, error: childrenError } = await supabase
      .from('profiles')
      .select('id, nick, birth_year, age_group, parent_approved, account_status, profile_photo_url, created_at')
      .ilike('tutor_email', tutorEmail)
      .order('created_at', { ascending: false });

    if (childrenError) {
      console.error('Error fetching children:', childrenError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch children' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tutor_email: tutorEmail,
        children: children || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in parent-dashboard-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
