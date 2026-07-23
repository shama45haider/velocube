// Velocube Master Panel - master-admin Edge Function
//
// One action-routed function for every auth-account operation the Master
// Panel needs: list users, create, reset password, change email, ban,
// unban, delete, and link a login to a client record.
//
// Security model:
// - The service_role key never leaves this function. The browser only
//   holds the anon key; every privileged operation goes through here.
// - Every request must carry a valid signed-in JWT AND pass two master
//   checks: the is_master() database function and a hardcoded email
//   comparison (defense in depth - if the SQL migration hasn't run,
//   the rpc fails and the request is rejected, never allowed).
// - Every mutating action is written to the activity table so there is
//   a permanent audit trail visible from both panels.
//
// Deploy: Supabase Dashboard -> Edge Functions -> Deploy new function
// -> name it "master-admin" -> paste this file -> keep "Verify JWT" ON.
// No secrets to configure: SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "jsr:@supabase/supabase-js@2";

const MASTER_EMAIL = "hr@velocube.net";

const ALLOWED_ORIGINS = [
  "https://velocube.net",
  "https://www.velocube.net",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "POST only" });

  // --- Gate 1: a real signed-in user ---------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { ok: false, error: "Not signed in" });
  const caller = userData.user;

  // --- Gate 2: the master account only -------------------------------
  const { data: masterFlag, error: masterErr } = await userClient.rpc("is_master");
  const emailOk = (caller.email ?? "").toLowerCase() === MASTER_EMAIL;
  if (masterErr || masterFlag !== true || !emailOk) {
    return json(403, { ok: false, error: "Master access only" });
  }

  // --- Privileged client (never exposed to the browser) --------------
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }
  const action = String(body.action ?? "");

  const audit = async (kind: string, ref: string, detail: string) => {
    // Audit failures should never block the action itself.
    try {
      await admin.from("activity").insert({
        agent: "Master (" + MASTER_EMAIL + ")",
        kind: "master_" + kind,
        ref,
        detail,
      });
    } catch (_e) { /* ignore */ }
  };

  try {
    switch (action) {
      // ------------------------------------------------------------ ping
      case "ping":
        return json(200, { ok: true, version: 1, master: caller.email });

      // ------------------------------------------------------ list_users
      case "list_users": {
        // GoTrue paginates; walk every page (cap far above any real count).
        const users: Record<string, unknown>[] = [];
        for (let page = 1; page <= 20; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
          if (error) throw error;
          users.push(...(data?.users ?? []));
          if (!data || data.users.length < 100) break;
        }

        const [{ data: clients, error: cErr }, { data: agents, error: aErr }] = await Promise.all([
          admin.from("clients").select("id, account_number, business, email, auth_user_id"),
          admin.from("agents").select("name, email, role, active"),
        ]);
        if (cErr) throw cErr;
        if (aErr) throw aErr;

        const byAuthId = new Map((clients ?? []).filter((c) => c.auth_user_id).map((c) => [c.auth_user_id, c]));
        const clientByEmail = new Map((clients ?? []).map((c) => [(c.email ?? "").toLowerCase(), c]));
        const agentByEmail = new Map((agents ?? []).map((a) => [(a.email ?? "").toLowerCase(), a]));

        const out = users.map((u) => {
          const email = String(u.email ?? "").toLowerCase();
          const client = byAuthId.get(u.id) ?? clientByEmail.get(email) ?? null;
          const agent = agentByEmail.get(email) ?? null;
          const kind = client && agent ? "both" : agent ? "agent" : client ? "client" : "unlinked";
          return {
            id: u.id,
            email: u.email ?? "",
            created_at: u.created_at ?? null,
            last_sign_in_at: u.last_sign_in_at ?? null,
            email_confirmed_at: u.email_confirmed_at ?? null,
            banned_until: (u as Record<string, unknown>).banned_until ?? null,
            name: (u.user_metadata as Record<string, unknown> | undefined)?.name ?? null,
            identity: {
              kind,
              client_id: client?.id ?? null,
              account_number: client?.account_number ?? null,
              business: client?.business ?? null,
              agent_name: agent?.name ?? null,
              agent_role: agent?.role ?? null,
              agent_active: agent?.active ?? null,
              linked: client ? client.auth_user_id === u.id : false,
            },
          };
        });

        const userIds = new Set(users.map((u) => u.id));
        const orphans = (clients ?? [])
          .filter((c) => c.auth_user_id && !userIds.has(c.auth_user_id))
          .map((c) => ({ client_id: c.id, business: c.business, email: c.email }));

        return json(200, { ok: true, users: out, orphans });
      }

      // ----------------------------------------------------- create_user
      case "create_user": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        const name = body.name ? String(body.name) : undefined;
        if (!email || !password) return json(400, { ok: false, error: "Required: email, password" });
        if (password.length < 8) return json(400, { ok: false, error: "Password must be at least 8 characters" });

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: name ? { name } : undefined,
        });
        if (error) throw error;
        const newUser = data.user;

        if (body.link_client_id) {
          const { error: linkErr } = await admin
            .from("clients")
            .update({ auth_user_id: newUser.id })
            .eq("id", Number(body.link_client_id));
          if (linkErr) throw linkErr;
        }
        if (body.make_agent && typeof body.make_agent === "object") {
          const ma = body.make_agent as Record<string, unknown>;
          const { error: agErr } = await admin.from("agents").upsert(
            {
              name: String(ma.name ?? name ?? email),
              email,
              role: String(ma.role ?? "Support Agent"),
              active: true,
            },
            { onConflict: "email" },
          );
          if (agErr) throw agErr;
        }

        await audit("create_user", email, "Created auth account" +
          (body.link_client_id ? " linked to client #" + body.link_client_id : "") +
          (body.make_agent ? " with agent access" : ""));
        return json(200, { ok: true, user: { id: newUser.id, email: newUser.email } });
      }

      // ----------------------------------------------------- update_user
      case "update_user": {
        const userId = String(body.user_id ?? "");
        if (!userId) return json(400, { ok: false, error: "Required: user_id" });

        const patch: Record<string, unknown> = {};
        if (body.password) {
          const pw = String(body.password);
          if (pw.length < 8) return json(400, { ok: false, error: "Password must be at least 8 characters" });
          patch.password = pw;
        }
        if (body.email) {
          if (userId === caller.id) return json(400, { ok: false, error: "Change the master email in Supabase directly, not here" });
          patch.email = String(body.email).trim().toLowerCase();
          patch.email_confirm = true;
        }
        if (body.name !== undefined) patch.user_metadata = { name: String(body.name ?? "") };
        if (Object.keys(patch).length === 0) return json(400, { ok: false, error: "Nothing to update" });

        const { data, error } = await admin.auth.admin.updateUserById(userId, patch);
        if (error) throw error;

        // Optional cheap session-kill: a password change alone does not
        // reliably revoke the target's existing sessions, so the panel can
        // request a 1-minute ban to invalidate their refresh token.
        if (body.kick_sessions && userId !== caller.id) {
          await admin.auth.admin.updateUserById(userId, { ban_duration: "1m" } as never);
        }

        const what = [
          patch.password ? "password reset" : "",
          patch.email ? "email changed to " + patch.email : "",
          patch.user_metadata ? "name updated" : "",
        ].filter(Boolean).join(", ");
        await audit("update_user", data.user.email ?? userId, what || "updated");
        return json(200, { ok: true, user: { id: data.user.id, email: data.user.email } });
      }

      // -------------------------------------------------------- ban_user
      case "ban_user": {
        const userId = String(body.user_id ?? "");
        if (!userId) return json(400, { ok: false, error: "Required: user_id" });
        if (userId === caller.id) return json(400, { ok: false, error: "You cannot ban your own account" });
        const duration = String(body.duration ?? "87600h"); // ~10 years = effectively permanent
        const { data, error } = await admin.auth.admin.updateUserById(userId, { ban_duration: duration } as never);
        if (error) throw error;
        await audit("ban_user", data.user.email ?? userId, "Banned (" + duration + ")");
        return json(200, { ok: true });
      }

      // ------------------------------------------------------ unban_user
      case "unban_user": {
        const userId = String(body.user_id ?? "");
        if (!userId) return json(400, { ok: false, error: "Required: user_id" });
        const { data, error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" } as never);
        if (error) throw error;
        await audit("unban_user", data.user.email ?? userId, "Ban lifted");
        return json(200, { ok: true });
      }

      // ----------------------------------------------------- delete_user
      case "delete_user": {
        const userId = String(body.user_id ?? "");
        if (!userId) return json(400, { ok: false, error: "Required: user_id" });
        if (userId === caller.id) return json(400, { ok: false, error: "You cannot delete your own account" });

        const { data: target } = await admin.auth.admin.getUserById(userId);
        const targetEmail = target?.user?.email ?? userId;

        // Unlink any client first (the FK is ON DELETE SET NULL after the
        // migration, but doing it explicitly keeps this safe either way).
        const { error: unlinkErr } = await admin
          .from("clients")
          .update({ auth_user_id: null })
          .eq("auth_user_id", userId);
        if (unlinkErr) throw unlinkErr;

        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
        await audit("delete_user", targetEmail, "Auth account permanently deleted");
        return json(200, { ok: true });
      }

      // ------------------------------------------------------- link_user
      case "link_user": {
        const userId = String(body.user_id ?? "");
        if (!userId) return json(400, { ok: false, error: "Required: user_id" });
        const clientId = body.client_id == null ? null : Number(body.client_id);

        // One login maps to at most one client (unique index), so clear
        // any existing link for this user before setting the new one.
        const { error: clearErr } = await admin
          .from("clients")
          .update({ auth_user_id: null })
          .eq("auth_user_id", userId);
        if (clearErr) throw clearErr;

        if (clientId != null) {
          const { error: setErr } = await admin
            .from("clients")
            .update({ auth_user_id: userId })
            .eq("id", clientId);
          if (setErr) throw setErr;
        }

        const { data: target } = await admin.auth.admin.getUserById(userId);
        await audit("link_user", target?.user?.email ?? userId,
          clientId != null ? "Linked to client #" + clientId : "Unlinked from client");
        return json(200, { ok: true });
      }

      default:
        return json(400, { ok: false, error: "Unknown action: " + action });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { ok: false, error: msg });
  }
});
