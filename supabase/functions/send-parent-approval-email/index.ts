import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate cryptographically secure token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Hash token for storage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { child_user_id } = await req.json();

    if (!child_user_id) {
      return new Response(JSON.stringify({ error: "child_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get child profile
    const { data: childProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, nick, tutor_email, parent_approved")
      .eq("id", child_user_id)
      .single();

    if (profileError || !childProfile) {
      console.error("Error fetching child profile:", profileError);
      return new Response(JSON.stringify({ error: "Child profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already approved
    if (childProfile.parent_approved) {
      return new Response(JSON.stringify({ ok: true, already_approved: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tutorEmail = childProfile.tutor_email;

    // Check for existing active token for this tutor
    const { data: existingToken } = await supabase
      .from("tutor_access_tokens")
      .select("id, token_hash")
      .eq("tutor_email", tutorEmail)
      .eq("is_revoked", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let token: string;
    let tokenHash: string;

    if (existingToken) {
      // Generate new token but update the existing record
      token = generateSecureToken();
      tokenHash = await hashToken(token);

      await supabase
        .from("tutor_access_tokens")
        .update({ token_hash: tokenHash, last_used_at: new Date().toISOString() })
        .eq("id", existingToken.id);
    } else {
      // Create new token
      token = generateSecureToken();
      tokenHash = await hashToken(token);

      await supabase.from("tutor_access_tokens").insert({
        tutor_email: tutorEmail,
        token_hash: tokenHash,
      });
    }

    // Generate links
    // Use the published URL or fallback to a preview URL pattern
    const baseUrl = "https://fvchat.lovable.app";
    const approveUrl = `${APP_URL}/#/parent/approve?token=${token}&child=${child_user_id}`;
    const dashboardUrl = `${APP_URL}/#/parent?token=${token}`;

    // Log notification for audit (using tutor_notifications table)
    await supabase.from("tutor_notifications").insert({
      user_id: child_user_id,
      tutor_email: tutorEmail,
      type: "approval_request",
      status: "queued",
      payload: {
        child_nick: childProfile.nick,
        approve_url: approveUrl,
        dashboard_url: dashboardUrl,
      },
    });

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

    // Try to send email via Resend if available
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "VFC Kids Connect <noreply@vfc.app>",
            to: [tutorEmail],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (resendResponse.ok) {
          // Update notification status
          await supabase
            .from("tutor_notifications")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("user_id", child_user_id)
            .eq("type", "approval_request")
            .order("created_at", { ascending: false })
            .limit(1);

          console.log("Email sent successfully to:", tutorEmail);
        } else {
          const errorText = await resendResponse.text();
          console.error("Resend error:", errorText);

          await supabase
            .from("tutor_notifications")
            .update({ status: "failed", error: errorText })
            .eq("user_id", child_user_id)
            .eq("type", "approval_request")
            .order("created_at", { ascending: false })
            .limit(1);
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
      }
    } else {
      console.log("RESEND_API_KEY not configured. Email queued but not sent.");
      console.log("Approve URL:", approveUrl);
      console.log("Dashboard URL:", dashboardUrl);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        email_sent: !!resendApiKey,
        approve_url: approveUrl,
        dashboard_url: dashboardUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error in send-parent-approval-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
