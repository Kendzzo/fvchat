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

const VERSION = "1.1.0"; // Updated to use RESEND_FROM secret

serve(async (req) => {
  console.log(`[send-parent-approval-email v${VERSION}] Request received`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { child_user_id } = await req.json();
    console.log(`[send-parent-approval-email] Step 1: Received child_user_id = ${child_user_id}`);

    if (!child_user_id) {
      console.error("[send-parent-approval-email] ERROR: child_user_id is missing");
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
    console.log("[send-parent-approval-email] Step 2: Fetching child profile...");
    const { data: childProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, nick, tutor_email, parent_approved")
      .eq("id", child_user_id)
      .single();

    if (profileError || !childProfile) {
      console.error("[send-parent-approval-email] ERROR: Child profile not found", profileError);
      return new Response(JSON.stringify({ error: "Child profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `[send-parent-approval-email] Step 2: Profile found - nick: @${childProfile.nick}, tutor: ${childProfile.tutor_email}`,
    );

    // We always send email even if already approved (for re-sends)
    const tutorEmail = childProfile.tutor_email;

    // Generate new token always to ensure email works
    console.log("[send-parent-approval-email] Step 3: Generating secure token...");
    const token = generateSecureToken();
    const tokenHash = await hashToken(token);

    // Check for existing active token for this tutor and update, or create new
    const { data: existingToken } = await supabase
      .from("tutor_access_tokens")
      .select("id")
      .eq("tutor_email", tutorEmail)
      .eq("is_revoked", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingToken) {
      await supabase
        .from("tutor_access_tokens")
        .update({ token_hash: tokenHash, last_used_at: new Date().toISOString() })
        .eq("id", existingToken.id);
      console.log("[send-parent-approval-email] Step 3: Updated existing token");
    } else {
      await supabase.from("tutor_access_tokens").insert({
        tutor_email: tutorEmail,
        token_hash: tokenHash,
      });
      console.log("[send-parent-approval-email] Step 3: Created new token");
    }

    // Generate links - using HashRouter format (/#/)
    console.log("[send-parent-approval-email] Step 4: Generating links...");
    const baseUrl = "https://fvchat.lovable.app";
    const approveUrl = `${baseUrl}/#/parent/approve?token=${token}&child=${child_user_id}`;
    const dashboardUrl = `${baseUrl}/#/parent?token=${token}`;
    console.log(`[send-parent-approval-email] Step 4: approveUrl = ${approveUrl}`);
    console.log(`[send-parent-approval-email] Step 4: dashboardUrl = ${dashboardUrl}`);

    // Log notification for audit (using tutor_notifications table)
    console.log("[send-parent-approval-email] Step 5: Inserting tutor_notification...");
    const { error: notifError } = await supabase.from("tutor_notifications").insert({
      user_id: child_user_id,
      tutor_email: tutorEmail,
      type: "approval",
      status: "queued",
      payload: {
        child_nick: childProfile.nick,
        approve_url: approveUrl,
        dashboard_url: dashboardUrl,
      },
    });

    if (notifError) {
      console.error("[send-parent-approval-email] Step 5: Error inserting notification", notifError);
    } else {
      console.log("[send-parent-approval-email] Step 5: Notification inserted successfully");
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

    // Try to send email via Resend
    console.log("[send-parent-approval-email] Step 6: Checking RESEND_API_KEY...");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log(
        "[send-parent-approval-email] WARNING: RESEND_API_KEY not configured. Email NOT sent but URLs generated.",
      );
      // Update notification status
      await supabase
        .from("tutor_notifications")
        .update({ status: "skipped", error: "RESEND_API_KEY missing" })
        .eq("user_id", child_user_id)
        .eq("type", "approval")
        .order("created_at", { ascending: false })
        .limit(1);

      return new Response(
        JSON.stringify({
          ok: true,
          email_sent: false,
          reason: "RESEND_API_KEY not configured",
          approve_url: approveUrl,
          dashboard_url: dashboardUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[send-parent-approval-email] Step 6: RESEND_API_KEY found, sending email...");

    // Track if email was actually sent
    let emailSentSuccessfully = false;
    let errorCode: string | null = null;

    try {
      // Use RESEND_FROM from secrets (must be a verified domain in Resend)
      const fromAddress = Deno.env.get("RESEND_FROM");
      
      if (!fromAddress) {
        console.error("[send-parent-approval-email] Step 6: RESEND_FROM secret is not configured");
        
        await supabase
          .from("tutor_notifications")
          .update({ status: "failed", error: "RESEND_FROM secret not configured" })
          .eq("user_id", child_user_id)
          .eq("type", "approval")
          .order("created_at", { ascending: false })
          .limit(1);
        
        return new Response(
          JSON.stringify({
            ok: true,
            email_sent: false,
            error_code: "RESEND_FROM_MISSING",
            reason: "RESEND_FROM secret not configured",
            approve_url: approveUrl,
            dashboard_url: dashboardUrl,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      
      console.log(`[send-parent-approval-email] Step 6: Using fromAddress = ${fromAddress}`);

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [tutorEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      const resendData = await resendResponse.json();

      if (resendResponse.ok) {
        // Update notification status to sent
        await supabase
          .from("tutor_notifications")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("user_id", child_user_id)
          .eq("type", "approval")
          .order("created_at", { ascending: false })
          .limit(1);

        emailSentSuccessfully = true;
        console.log(`[send-parent-approval-email] Step 6: SUCCESS - Email sent to ${tutorEmail}, id: ${resendData.id}`);
      } else {
        // Determine specific error code for debugging
        errorCode = resendResponse.status === 403 ? "RESEND_403" : `RESEND_${resendResponse.status}`;
        const errorDetails = `Status: ${resendResponse.status}, Body: ${JSON.stringify(resendData)}`;
        console.error(`[send-parent-approval-email] Step 6: Resend API error (${errorCode}):`, errorDetails);

        await supabase
          .from("tutor_notifications")
          .update({ status: "failed", error: errorDetails })
          .eq("user_id", child_user_id)
          .eq("type", "approval")
          .order("created_at", { ascending: false })
          .limit(1);
      }
    } catch (emailError) {
      errorCode = "RESEND_ERROR";
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      console.error(`[send-parent-approval-email] Step 6: Email sending exception (${errorCode}):`, errorMessage);

      await supabase
        .from("tutor_notifications")
        .update({ status: "failed", error: `Exception: ${errorMessage}` })
        .eq("user_id", child_user_id)
        .eq("type", "approval")
        .order("created_at", { ascending: false })
        .limit(1);
    }

    console.log(`[send-parent-approval-email] Step 7: Returning response, email_sent: ${emailSentSuccessfully}, error_code: ${errorCode}`);
    
    // CRITICAL: Only return ok:true if email was actually sent
    if (!emailSentSuccessfully) {
      return new Response(
        JSON.stringify({
          ok: false,
          email_sent: false,
          error_code: errorCode || "EMAIL_NOT_SENT",
          reason: "El email no pudo ser enviado",
          approve_url: approveUrl,
          dashboard_url: dashboardUrl,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    
    return new Response(
      JSON.stringify({
        ok: true,
        email_sent: true,
        approve_url: approveUrl,
        dashboard_url: dashboardUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[send-parent-approval-email] FATAL ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
