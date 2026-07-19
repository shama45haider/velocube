// Velocube Support Panel — send-ticket-email Edge Function
//
// Delivers a ticket reply to the client's inbox via Resend.
// Called by the panel after a reply is saved to ticket_messages.
//
// Deploy (from the repo root, with the Supabase CLI installed and logged in):
//   supabase functions deploy send-ticket-email --project-ref YOUR_PROJECT_REF
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx --project-ref YOUR_PROJECT_REF
//   supabase secrets set MAIL_FROM="Velocube Support <support@velocube.net>" --project-ref YOUR_PROJECT_REF
//
// Notes:
// - The sender domain (velocube.net) must be verified in Resend first
//   (Resend Dashboard -> Domains -> Add Domain, then add the DNS records).
// - Until then, Resend's sandbox sender ("onboarding@resend.dev") works but
//   can only deliver to the email address that owns the Resend account.
// - The function requires a signed-in agent session (the panel passes the
//   user's JWT automatically via supabase.functions.invoke).

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "Velocube Support <onboarding@resend.dev>";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  // Verify the caller is a signed-in agent.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Not signed in" });

  if (!RESEND_API_KEY) {
    return json(500, { error: "RESEND_API_KEY is not set. Run: supabase secrets set RESEND_API_KEY=..." });
  }

  let payload: {
    message_id?: number;
    to?: string;
    to_name?: string;
    subject?: string;
    body?: string;
    ticket_id?: string;
    agent_name?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { message_id, to, to_name, subject, body, ticket_id, agent_name } = payload;
  if (!to || !subject || !body || !ticket_id) {
    return json(400, { error: "Required: to, subject, body, ticket_id" });
  }

  const htmlBody = body
    .split("\n")
    .map((line) =>
      line.trim() === ""
        ? "<br>"
        : `<p style="margin:0 0 4px">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    )
    .join("");

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;color:#14120f">
    <div style="border-top:4px solid #ff5c1a;background:#f6f4f1;padding:20px 24px;border-radius:0 0 12px 12px">
      <p style="margin:0;font-weight:700;font-size:16px"><span style="color:#ff5c1a">Velo</span>cube Support</p>
      <p style="margin:2px 0 0;color:#8b8579;font-size:12px">Ticket ${ticket_id} · Reply to this email to continue the conversation</p>
    </div>
    <div style="padding:24px;font-size:14px;line-height:1.65">${htmlBody}</div>
    <div style="padding:16px 24px;border-top:1px solid #e8e5e0;color:#8b8579;font-size:12px">
      <p style="margin:0">Velocube · velocube.net · (718) 635-0662</p>
    </div>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [to],
      reply_to: "hr@velocube.net",
      subject: `[${ticket_id}] ${subject}`,
      html,
      text: body,
    }),
  });

  const emailStatus = res.ok ? "sent" : "failed";

  // Record delivery status on the message row (service role not needed;
  // agents have update rights on ticket_messages).
  if (message_id) {
    await supabase
      .from("ticket_messages")
      .update({ email_status: emailStatus })
      .eq("id", message_id);
  }

  if (!res.ok) {
    const errBody = await res.text();
    return json(502, { error: "Resend rejected the email", detail: errBody, email_status: emailStatus });
  }

  return json(200, { ok: true, email_status: emailStatus, to, sent_by: agent_name ?? userData.user.email });
});
