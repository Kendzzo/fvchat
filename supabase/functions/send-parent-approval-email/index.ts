import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION = "send-parent-approval-email";
const VERSION = "2026-01-30";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return '(invalid)';
  const userMasked = user.length <= 2 ? `${user[0] ?? ''}*` : `${user.slice(0, 2)}***`;
  const domainParts = domain.split('.');
  const domainName = domainParts[0] || domain;
  const domainMasked = domainName.length <= 2 ? `${domainName[0] ?? ''}*` : `${domainName.slice(0, 2)}***`;
  const tld = domainParts.slice(1).join('.') || '***';
  return `${userMasked}@${domainMasked}.${tld}`;
}

function prefix(value: string, len = 10): string {
  if (!value) return '';
  return value.slice(0, len);
}

// Generate cryptographically secure token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash token for storage
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
    const { child_user_id } = await req.json();

    console.log(`[${FUNCTION}] start`, { version: VERSION, child_user_id });

    if (!child_user_id) {
      return new Response(
        JSON.stringify({ error: 'child_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev';

    // Get child profile
    const { data: childProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, nick, tutor_email, parent_approved')
      .eq('id', child_user_id)
      .single();

    if (profileError || !childProfile) {
      console.error('Error fetching child profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Child profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${FUNCTION}] profile_found`, {
      child_user_id,
      child_nick: childProfile.nick,
      tutor_email_masked: maskEmail(childProfile.tutor_email),
      parent_approved: childProfile.parent_approved,
      has_resend_api_key: !!resendApiKey,
      resend_from: resendFrom,
    });

    // Check if already approved
    if (childProfile.parent_approved) {
      console.log(`[${FUNCTION}] already_approved`, { child_user_id });
      return new Response(
        JSON.stringify({ ok: true, already_approved: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tutorEmail = childProfile.tutor_email;

    if (!tutorEmail || tutorEmail.trim().length === 0) {
      console.error(`[${FUNCTION}] missing_tutor_email`, { child_user_id, child_nick: childProfile.nick });
      // Even if empty string, we can still store the record for audit (tutor_email column is NOT NULL).
      await supabase
        .from('tutor_notifications')
        .insert({
          user_id: child_user_id,
          tutor_email: tutorEmail ?? '',
          type: 'approval',
          status: 'failed',
          payload: {
            child_user_id,
            child_nick: childProfile.nick,
            provider: 'resend',
            provider_error: 'Missing tutor_email on profile',
          },
        });

      return new Response(
        JSON.stringify({ ok: false, sent: false, fallback: true, provider_error: 'Missing tutor_email on profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing active token for this tutor
    const { data: existingToken } = await supabase
      .from('tutor_access_tokens')
      .select('id, token_hash')
      .eq('tutor_email', tutorEmail)
      .eq('is_revoked', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let token: string;
    let tokenHash: string;

    if (existingToken) {
      // Generate new token but update the existing record
      token = generateSecureToken();
      tokenHash = await hashToken(token);

      console.log(`[${FUNCTION}] token_reused_record_updated`, {
        tutor_email_masked: maskEmail(tutorEmail),
        token_hash_prefix: prefix(tokenHash, 12),
      });
      
      await supabase
        .from('tutor_access_tokens')
        .update({ token_hash: tokenHash, last_used_at: new Date().toISOString() })
        .eq('id', existingToken.id);
    } else {
      // Create new token
      token = generateSecureToken();
      tokenHash = await hashToken(token);

      console.log(`[${FUNCTION}] token_created`, {
        tutor_email_masked: maskEmail(tutorEmail),
        token_hash_prefix: prefix(tokenHash, 12),
      });
      
      await supabase
        .from('tutor_access_tokens')
        .insert({
          tutor_email: tutorEmail,
          token_hash: tokenHash
        });
    }

    // Generate links
    // Use the published URL or fallback to a preview URL pattern
    const baseUrl = 'https://fvchat.lovable.app';
    const approveUrl = `${baseUrl}/parent/approve?token=${token}&child=${child_user_id}`;
    const dashboardUrl = `${baseUrl}/parent?token=${token}`;

    console.log(`[${FUNCTION}] links_generated`, {
      approve_url_prefix: `${baseUrl}/parent/approve?token=${prefix(token, 10)}...`,
      dashboard_url_prefix: `${baseUrl}/parent?token=${prefix(token, 10)}...`,
    });

    // ALWAYS record an audit notification (so we never fail silently)
    const notificationPayloadBase = {
      child_user_id,
      child_nick: childProfile.nick,
      approve_url: approveUrl,
      dashboard_url: dashboardUrl,
      provider: 'resend',
    };

    const { data: insertedNotification, error: insertNotifError } = await supabase
      .from('tutor_notifications')
      .insert({
        user_id: child_user_id,
        tutor_email: tutorEmail,
        type: 'approval',
        status: 'queued',
        payload: notificationPayloadBase,
      })
      .select('id')
      .single();

    if (insertNotifError) {
      console.error(`[${FUNCTION}] tutor_notifications_insert_failed`, { error: insertNotifError });
    } else {
      console.log(`[${FUNCTION}] tutor_notifications_inserted`, { id: insertedNotification?.id });
    }

    // Email content in Spanish
    const emailSubject = `VFC Kids Connect - Aprobación de registro para @${childProfile.nick}`;
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aprobación de Registro - VFC Kids Connect</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f; color: #ffffff; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0f 100%); border-radius: 16px; overflow: hidden; border: 1px solid #2a2a3e;">
    
    <div style="background: linear-gradient(135deg, #9b87f5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; color: #ffffff;">VFC Kids Connect</h1>
      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Red Social Segura para Niños</p>
    </div>
    
    <div style="padding: 30px;">
      <h2 style="color: #9b87f5; margin-top: 0;">¡Hola!</h2>
      
      <p style="line-height: 1.6; color: #d1d5db;">
        <strong>@${childProfile.nick}</strong> ha solicitado crear una cuenta en VFC Kids Connect.
      </p>
      
      <div style="background: rgba(155, 135, 245, 0.1); border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(155, 135, 245, 0.3);">
        <h3 style="margin-top: 0; color: #9b87f5; font-size: 16px;">¿Qué es VFC Kids Connect?</h3>
        <ul style="color: #d1d5db; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Red social <strong>diseñada exclusivamente para niños de 6-16 años</strong></li>
          <li>Contenido moderado con <strong>IA y supervisión humana</strong></li>
          <li>Panel de supervisión parental para <strong>ver toda su actividad</strong></li>
        </ul>
      </div>
      
      <p style="line-height: 1.6; color: #d1d5db;">
        Como tutor/a legal, necesitamos tu aprobación para activar la cuenta.
      </p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${approveUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold; font-size: 16px; margin-bottom: 15px;">
          ✓ APROBAR REGISTRO
        </a>
        <br><br>
        <a href="${dashboardUrl}" style="display: inline-block; background: transparent; color: #9b87f5; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; border: 2px solid #9b87f5;">
          👁 ACCEDER A SUPERVISIÓN
        </a>
      </div>
      
      <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
        Desde el panel de supervisión podrás ver las publicaciones, comentarios, chats y mensajes de tu hijo/a en cualquier momento.
      </p>
      
      <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 25px 0;">
      
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        Si no reconoces esta solicitud, puedes ignorar este email.<br>
        La cuenta no se activará sin tu aprobación.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Hard validation: missing RESEND_API_KEY => fallback (do not even try)
    if (!resendApiKey) {
      const providerError = 'RESEND_API_KEY not configured';
      console.error(`[${FUNCTION}] resend_missing_api_key`, { provider_error: providerError });
      console.log(`[${FUNCTION}] fallback_links`, {
        approve_url_prefix: `${baseUrl}/parent/approve?token=${prefix(token, 10)}...`,
        dashboard_url_prefix: `${baseUrl}/parent?token=${prefix(token, 10)}...`,
      });

      // Update latest notification for this user/type
      await supabase
        .from('tutor_notifications')
        .update({
          status: 'failed',
          error: providerError,
          payload: {
            ...notificationPayloadBase,
            provider_status: null,
            provider_error: providerError,
          },
        })
        .eq('user_id', child_user_id)
        .eq('type', 'approval')
        .order('created_at', { ascending: false })
        .limit(1);

      return new Response(
        JSON.stringify({ ok: false, sent: false, fallback: true, provider_error: providerError, approve_url: approveUrl, dashboard_url: dashboardUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${FUNCTION}] resend_attempt`, {
      to_masked: maskEmail(tutorEmail),
      from: resendFrom,
    });

    let resendStatus: number | null = null;
    let resendErrorText: string | null = null;

    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [tutorEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      resendStatus = resendResponse.status;
      const resendBody = await resendResponse.text();

      if (resendResponse.ok) {
        console.log(`[${FUNCTION}] resend_success`, { status: resendStatus, body_preview: resendBody.slice(0, 200) });

        await supabase
          .from('tutor_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            payload: {
              ...notificationPayloadBase,
              provider_status: resendStatus,
              provider_error: null,
            },
          })
          .eq('user_id', child_user_id)
          .eq('type', 'approval')
          .order('created_at', { ascending: false })
          .limit(1);

        return new Response(
          JSON.stringify({ ok: true, sent: true, fallback: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      resendErrorText = resendBody;
      console.error(`[${FUNCTION}] resend_failed`, { status: resendStatus, error: resendErrorText });
    } catch (emailError) {
      resendErrorText = emailError instanceof Error ? emailError.message : String(emailError);
      console.error(`[${FUNCTION}] resend_exception`, { error: resendErrorText });
    }

    // Fallback: persist detailed provider error + links
    const providerError = resendErrorText || 'Unknown Resend error';
    console.log(`[${FUNCTION}] fallback`, {
      provider_status: resendStatus,
      provider_error_preview: providerError.slice(0, 250),
    });
    console.log(`[${FUNCTION}] fallback_links`, {
      approve_url_prefix: `${baseUrl}/parent/approve?token=${prefix(token, 10)}...`,
      dashboard_url_prefix: `${baseUrl}/parent?token=${prefix(token, 10)}...`,
    });

    await supabase
      .from('tutor_notifications')
      .update({
        status: 'failed',
        error: providerError,
        payload: {
          ...notificationPayloadBase,
          provider_status: resendStatus,
          provider_error: providerError,
        },
      })
      .eq('user_id', child_user_id)
      .eq('type', 'approval')
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({ ok: false, sent: false, fallback: true, provider_error: providerError, approve_url: approveUrl, dashboard_url: dashboardUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-parent-approval-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
