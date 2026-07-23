/* Velocube Master Control — data layer
   Two adapters behind one surface:
   - Supabase adapter (normal use): business data via RLS (the master
     account is an agent), auth-account administration via the
     master-admin Edge Function.
   - Sandbox adapter (?demo=1 or missing config): in-memory fake data so
     the UI can be exercised without touching the live project. */
window.VeloMasterAPI = (function () {
  "use strict";

  var cfg = window.VELO_MASTER_CONFIG || {};
  var forceSandbox = /[?&#]demo=1/.test(location.search + location.hash);
  var hasSupabase =
    !forceSandbox &&
    !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) &&
    typeof window.supabase !== "undefined";

  /* ======================================================================
     Sandbox adapter
     ====================================================================== */
  function makeSandboxAdapter() {
    var MASTER = "master@velocube.net";
    var now = Date.now();
    function iso(daysAgo, hoursAgo) {
      return new Date(now - (daysAgo || 0) * 864e5 - (hoursAgo || 0) * 36e5).toISOString();
    }

    var db = {
      users: [
        { id: "u-master", email: MASTER, created_at: iso(400), last_sign_in_at: iso(0, 1), email_confirmed_at: iso(400), banned_until: null, name: "Velocube HQ",
          identity: { kind: "agent", agent_name: "Velocube HQ", agent_role: "Owner", agent_active: true, client_id: null, business: null, linked: false } },
        { id: "u-agent1", email: "sam@velocube.net", created_at: iso(210), last_sign_in_at: iso(1, 3), email_confirmed_at: iso(210), banned_until: null, name: "Sam Rivera",
          identity: { kind: "agent", agent_name: "Sam Rivera", agent_role: "Support Agent", agent_active: true, client_id: null, business: null, linked: false } },
        { id: "u-client1", email: "maria@eastvillagebuyers.com", created_at: iso(120), last_sign_in_at: iso(2), email_confirmed_at: iso(120), banned_until: null, name: "Maria Lopez",
          identity: { kind: "client", client_id: 1, account_number: "VC-1001", business: "East Village Buyers", linked: true, agent_name: null } },
        { id: "u-client2", email: "owner@budgetbear.xyz", created_at: iso(80), last_sign_in_at: iso(9), email_confirmed_at: iso(80), banned_until: null, name: "Dee Park",
          identity: { kind: "client", client_id: 2, account_number: "VC-1002", business: "Budget Bear", linked: true, agent_name: null } },
        { id: "u-banned", email: "spam@example.com", created_at: iso(30), last_sign_in_at: iso(28), email_confirmed_at: iso(30), banned_until: iso(-3650), name: null,
          identity: { kind: "unlinked", client_id: null, business: null, linked: false, agent_name: null } },
        { id: "u-new", email: "kai@bounitnyc.com", created_at: iso(4), last_sign_in_at: null, email_confirmed_at: iso(4), banned_until: null, name: "Kai Osei",
          identity: { kind: "unlinked", client_id: null, business: null, linked: false, agent_name: null } }
      ],
      orphans: [{ client_id: 4, business: "Frontline Jerk", email: "chef@frontlinejerk.com" }],
      clients: [
        { id: 1, account_number: "VC-1001", business: "East Village Buyers", contact: "Maria Lopez", email: "maria@eastvillagebuyers.com", phone: "(917) 555-0141", plan: "Business Site", monthly: 150, term: "12 mo", status: "Active", client_since: "2026-03-20", renewal_date: "2027-03-20", storage_used: 3.2, storage_limit: 10, notes: "Prefers phone. Renewal call booked.", auth_user_id: "u-client1" },
        { id: 2, account_number: "VC-1002", business: "Budget Bear", contact: "Dee Park", email: "owner@budgetbear.xyz", phone: "(347) 555-0177", plan: "Starter Site", monthly: 0, term: "one-time", status: "Active", client_since: "2026-05-02", renewal_date: null, storage_used: 1.1, storage_limit: 5, notes: "", auth_user_id: "u-client2" },
        { id: 3, account_number: "VC-1003", business: "BounitNYC", contact: "Kai Osei", email: "kai@bounitnyc.com", phone: "(646) 555-0122", plan: "Business Site + Hosting", monthly: 150, term: "12 mo", status: "Onboarding", client_since: "2026-07-10", renewal_date: "2027-07-10", storage_used: 0.4, storage_limit: 10, notes: "Waiting on brand assets.", auth_user_id: null },
        { id: 4, account_number: "VC-1004", business: "Frontline Jerk", contact: "Andre Grant", email: "chef@frontlinejerk.com", phone: "(718) 555-0190", plan: "Custom Build", monthly: 300, term: "24 mo", status: "Active", client_since: "2025-11-15", renewal_date: "2027-11-15", storage_used: 6.8, storage_limit: 20, notes: "", auth_user_id: "u-gone" }
      ],
      services: [
        { id: 1, client_id: 1, name: "Business website", type: "Build", price: 2500, status: "Delivered", progress: 100, started: "2026-03-22", delivered: "2026-04-30" },
        { id: 2, client_id: 1, name: "Managed hosting", type: "Hosting", price: 150, status: "Active", progress: 100, started: "2026-05-01", delivered: null },
        { id: 3, client_id: 3, name: "Business website", type: "Build", price: 3200, status: "In progress", progress: 45, started: "2026-07-12", delivered: null },
        { id: 4, client_id: 4, name: "Online ordering system", type: "Custom", price: 6500, status: "In progress", progress: 80, started: "2026-06-01", delivered: null }
      ],
      tickets: [
        { id: "TK-2411", client_id: 1, subject: "Update homepage hours", status: "Open", priority: "Normal", source: "Email", assignee: "Sam Rivera", created_at: iso(2), updated_at: iso(0, 5), tags: ["content"] },
        { id: "TK-2410", client_id: 4, subject: "Menu photos not loading", status: "In progress", priority: "High", source: "Portal", assignee: "Sam Rivera", created_at: iso(3), updated_at: iso(1), tags: ["bug"] },
        { id: "TK-2405", client_id: 2, subject: "Question about add-ons", status: "Waiting", priority: "Low", source: "Portal", assignee: null, created_at: iso(8), updated_at: iso(6), tags: [] },
        { id: "TK-2398", client_id: 1, subject: "SSL renewal confirmation", status: "Closed", priority: "Normal", source: "Email", assignee: "Velocube HQ", created_at: iso(20), updated_at: iso(18), tags: ["hosting"] }
      ],
      agents: [
        { id: 1, name: "Velocube HQ", email: MASTER, role: "Owner", active: true },
        { id: 2, name: "Sam Rivera", email: "sam@velocube.net", role: "Support Agent", active: true },
        { id: 3, name: "Lena Ortiz", email: "lena@velocube.net", role: "Support Agent", active: false }
      ],
      orders: [
        { id: 1, client_id: 1, addon_key: "seo-boost", label: "SEO Boost", price: 299, status: "requested", note: "Wants to start next month", requested_at: iso(1) },
        { id: 2, client_id: 4, addon_key: "content-refresh", label: "Content Refresh", price: 199, status: "in progress", note: "", requested_at: iso(6) },
        { id: 3, client_id: 2, addon_key: "logo-pack", label: "Logo Pack", price: 149, status: "delivered", note: "", requested_at: iso(15) }
      ],
      documents: [
        { id: 1, client_id: 1, title: "Website Build Agreement", kind: "agreement", requires_signature: true, signed_at: iso(110), signed_name: "Maria Lopez", created_at: iso(115) },
        { id: 2, client_id: 3, title: "Hosting Terms", kind: "agreement", requires_signature: true, signed_at: null, signed_name: null, created_at: iso(10) },
        { id: 3, client_id: 4, title: "Project Scope v2", kind: "scope", requires_signature: false, signed_at: null, signed_name: null, created_at: iso(30) }
      ],
      announcements: [
        { id: 1, title: "Portal maintenance Friday night", body: "The client portal will be briefly unavailable Friday 11pm-midnight ET.", kind: "notice", pinned: true, created_at: iso(2) },
        { id: 2, title: "New add-on: Content Refresh", body: "Quarterly copy and image refresh is now available from the Add-ons page.", kind: "news", pinned: false, created_at: iso(12) }
      ],
      staging: [
        { id: 1, client_id: 3, label: "BounitNYC staging", url: "https://staging.bounitnyc.com", status: "live", last_deploy: iso(1) },
        { id: 2, client_id: 4, label: "Ordering system beta", url: "https://beta.frontlinejerk.com", status: "live", last_deploy: iso(0, 7) }
      ],
      activity: [
        { id: 1, ts: iso(0, 2), agent: "Master (" + MASTER + ")", kind: "master_update_user", ref: "owner@budgetbear.xyz", detail: "password reset" },
        { id: 2, ts: iso(0, 6), agent: "Sam Rivera", kind: "ticket_reply", ref: "TK-2411", detail: "Replied to East Village Buyers" },
        { id: 3, ts: iso(1), agent: "Master (" + MASTER + ")", kind: "master_ban_user", ref: "spam@example.com", detail: "Banned (87600h)" },
        { id: 4, ts: iso(2), agent: "Sam Rivera", kind: "ticket_status", ref: "TK-2410", detail: "Moved to In progress" },
        { id: 5, ts: iso(3), agent: "Velocube HQ", kind: "client_note", ref: "VC-1003", detail: "Onboarding call complete" }
      ]
    };

    var session = null;
    var nextId = 1000;

    function delay(value) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(value); }, 120);
      });
    }
    function clone(v) { return JSON.parse(JSON.stringify(v)); }

    function sandboxAdmin(action, params) {
      params = params || {};
      var target;
      switch (action) {
        case "ping":
          return delay({ ok: true, version: 1, master: MASTER, sandbox: true });
        case "list_users":
          return delay({ ok: true, users: clone(db.users), orphans: clone(db.orphans) });
        case "create_user":
          if (!params.email || !params.password) return Promise.reject(new Error("Required: email, password"));
          if (db.users.some(function (u) { return u.email === params.email; })) {
            return Promise.reject(new Error("A user with this email already exists"));
          }
          var nu = { id: "u-" + (nextId++), email: params.email, created_at: new Date().toISOString(), last_sign_in_at: null, email_confirmed_at: new Date().toISOString(), banned_until: null, name: params.name || null,
            identity: { kind: "unlinked", client_id: null, business: null, linked: false, agent_name: null } };
          if (params.link_client_id) {
            var lc = db.clients.find(function (c) { return c.id === Number(params.link_client_id); });
            if (lc) { lc.auth_user_id = nu.id; nu.identity = { kind: "client", client_id: lc.id, account_number: lc.account_number, business: lc.business, linked: true, agent_name: null }; }
          }
          if (params.make_agent) {
            db.agents.push({ id: nextId++, name: (params.make_agent.name || params.name || params.email), email: params.email, role: params.make_agent.role || "Support Agent", active: true });
            nu.identity.kind = nu.identity.client_id ? "both" : "agent";
            nu.identity.agent_name = params.make_agent.name || params.name || params.email;
          }
          db.users.push(nu);
          return delay({ ok: true, user: { id: nu.id, email: nu.email } });
        case "update_user":
          target = db.users.find(function (u) { return u.id === params.user_id; });
          if (!target) return Promise.reject(new Error("User not found"));
          if (params.email && target.id === "u-master") return Promise.reject(new Error("Change the master email in Supabase directly, not here"));
          if (params.email) target.email = params.email;
          if (params.name !== undefined) target.name = params.name;
          return delay({ ok: true, user: { id: target.id, email: target.email } });
        case "ban_user":
          if (params.user_id === "u-master") return Promise.reject(new Error("You cannot ban your own account"));
          target = db.users.find(function (u) { return u.id === params.user_id; });
          if (!target) return Promise.reject(new Error("User not found"));
          target.banned_until = new Date(now + 10 * 365 * 864e5).toISOString();
          return delay({ ok: true });
        case "unban_user":
          target = db.users.find(function (u) { return u.id === params.user_id; });
          if (!target) return Promise.reject(new Error("User not found"));
          target.banned_until = null;
          return delay({ ok: true });
        case "delete_user":
          if (params.user_id === "u-master") return Promise.reject(new Error("You cannot delete your own account"));
          db.clients.forEach(function (c) { if (c.auth_user_id === params.user_id) c.auth_user_id = null; });
          db.users = db.users.filter(function (u) { return u.id !== params.user_id; });
          return delay({ ok: true });
        case "link_user":
          target = db.users.find(function (u) { return u.id === params.user_id; });
          if (!target) return Promise.reject(new Error("User not found"));
          db.clients.forEach(function (c) { if (c.auth_user_id === params.user_id) c.auth_user_id = null; });
          if (params.client_id != null) {
            var cl = db.clients.find(function (c) { return c.id === Number(params.client_id); });
            if (!cl) return Promise.reject(new Error("Client not found"));
            cl.auth_user_id = params.user_id;
            target.identity = { kind: target.identity.agent_name ? "both" : "client", client_id: cl.id, account_number: cl.account_number, business: cl.business, linked: true, agent_name: target.identity.agent_name || null };
          } else {
            target.identity = { kind: target.identity.agent_name ? "agent" : "unlinked", client_id: null, business: null, linked: false, agent_name: target.identity.agent_name || null };
          }
          return delay({ ok: true });
        default:
          return Promise.reject(new Error("Unknown action: " + action));
      }
    }

    return {
      mode: "sandbox",

      getSession: function () { return delay(session ? clone(session) : null); },
      signIn: function (email, _password) {
        if ((email || "").toLowerCase() !== MASTER) {
          var err = new Error("Master access only");
          err.code = "NOT_MASTER";
          return Promise.reject(err);
        }
        session = { email: MASTER, name: "Velocube HQ" };
        return delay(clone(session));
      },
      signOut: function () { session = null; return delay(true); },

      admin: sandboxAdmin,

      getCounts: function () {
        return delay({
          clients: db.clients.length,
          openTickets: db.tickets.filter(function (t) { return t.status !== "Closed"; }).length,
          agents: db.agents.filter(function (a) { return a.active; }).length,
          services: db.services.length,
          orders: db.orders.length,
          documents: db.documents.length,
          staging: db.staging.length,
          announcements: db.announcements.length
        });
      },
      getClients: function () { return delay(clone(db.clients)); },
      getClient: function (id) {
        var c = db.clients.find(function (x) { return x.id === Number(id); });
        return c ? delay(clone(c)) : Promise.reject(new Error("Client not found"));
      },
      getServices: function (clientId) {
        var rows = clientId ? db.services.filter(function (s) { return s.client_id === Number(clientId); }) : db.services;
        return delay(clone(rows));
      },
      getTickets: function (clientId) {
        var rows = clientId ? db.tickets.filter(function (t) { return t.client_id === Number(clientId); }) : db.tickets;
        return delay(clone(rows));
      },
      getAgents: function () { return delay(clone(db.agents)); },
      getOrders: function (clientId) {
        var rows = clientId ? db.orders.filter(function (o) { return o.client_id === Number(clientId); }) : db.orders;
        return delay(clone(rows));
      },
      getDocuments: function (clientId) {
        var rows = clientId ? db.documents.filter(function (d) { return d.client_id === Number(clientId); }) : db.documents;
        return delay(clone(rows));
      },
      getAnnouncements: function () { return delay(clone(db.announcements)); },
      getStaging: function (clientId) {
        var rows = clientId ? db.staging.filter(function (s) { return s.client_id === Number(clientId); }) : db.staging;
        return delay(clone(rows));
      },
      getActivity: function (limit) { return delay(clone(db.activity.slice(0, limit || 100))); },

      updateClient: function (id, patch) {
        var c = db.clients.find(function (x) { return x.id === Number(id); });
        if (!c) return Promise.reject(new Error("Client not found"));
        Object.assign(c, patch);
        return delay(clone(c));
      },
      updateTicket: function (id, patch) {
        var t = db.tickets.find(function (x) { return x.id === id; });
        if (!t) return Promise.reject(new Error("Ticket not found"));
        Object.assign(t, patch, { updated_at: new Date().toISOString() });
        return delay(clone(t));
      },
      saveAgent: function (agent) {
        if (agent.id) {
          var a = db.agents.find(function (x) { return x.id === Number(agent.id); });
          if (!a) return Promise.reject(new Error("Agent not found"));
          Object.assign(a, agent);
          return delay(clone(a));
        }
        agent.id = nextId++;
        if (agent.active === undefined) agent.active = true;
        db.agents.push(agent);
        return delay(clone(agent));
      },
      updateOrder: function (id, patch) {
        var o = db.orders.find(function (x) { return x.id === Number(id); });
        if (!o) return Promise.reject(new Error("Order not found"));
        Object.assign(o, patch);
        return delay(clone(o));
      },
      saveAnnouncement: function (ann) {
        if (ann.id) {
          var ex = db.announcements.find(function (x) { return x.id === Number(ann.id); });
          if (!ex) return Promise.reject(new Error("Announcement not found"));
          Object.assign(ex, ann);
          return delay(clone(ex));
        }
        ann.id = nextId++;
        ann.created_at = new Date().toISOString();
        db.announcements.unshift(ann);
        return delay(clone(ann));
      },
      deleteAnnouncement: function (id) {
        db.announcements = db.announcements.filter(function (a) { return a.id !== Number(id); });
        return delay(true);
      },
      logActivity: function (kind, ref, detail) {
        db.activity.unshift({ id: nextId++, ts: new Date().toISOString(), agent: "Master (" + MASTER + ")", kind: kind, ref: ref, detail: detail });
        return delay(true);
      }
    };
  }

  /* ======================================================================
     Supabase adapter
     ====================================================================== */
  function makeSupabaseAdapter() {
    var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    function rows(q) {
      return q.then(function (res) {
        if (res.error) throw new Error(res.error.message || "Database error");
        return res.data || [];
      });
    }
    function one(q) {
      return q.then(function (res) {
        if (res.error) throw new Error(res.error.message || "Database error");
        return res.data;
      });
    }
    function count(table, filter) {
      var q = sb.from(table).select("*", { head: true, count: "exact" });
      if (filter) q = filter(q);
      return q.then(function (res) {
        if (res.error) return 0; // a missing table should not sink the overview
        return res.count || 0;
      });
    }

    // The gate: signed in AND is_master() true, else treated as locked out.
    function assertMaster() {
      return sb.rpc("is_master").then(function (res) {
        if (res.error) throw new Error(res.error.message || "is_master() check failed - has supabase-master.sql been run?");
        if (res.data !== true) {
          var err = new Error("Master access only");
          err.code = "NOT_MASTER";
          throw err;
        }
        return true;
      });
    }

    return {
      mode: "supabase",

      getSession: function () {
        return sb.auth.getSession().then(function (res) {
          var s = res.data && res.data.session;
          if (!s) return null;
          return assertMaster().then(
            function () {
              var meta = s.user.user_metadata || {};
              return { email: s.user.email, name: meta.name || "Master" };
            },
            function () {
              // A restored session that is not the master gets dropped.
              return sb.auth.signOut().then(function () { return null; });
            }
          );
        });
      },
      signIn: function (email, password) {
        return sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
          if (res.error) throw new Error(res.error.message || "Sign-in failed");
          return assertMaster().catch(function (err) {
            return sb.auth.signOut().then(function () { throw err; });
          });
        }).then(function () {
          return sb.auth.getUser();
        }).then(function (res) {
          var u = res.data && res.data.user;
          var meta = (u && u.user_metadata) || {};
          return { email: u ? u.email : email, name: meta.name || "Master" };
        });
      },
      signOut: function () { return sb.auth.signOut().then(function () { return true; }); },

      admin: function (action, params) {
        var body = Object.assign({ action: action }, params || {});
        return sb.functions.invoke("master-admin", { body: body }).then(function (res) {
          if (res.error) {
            // FunctionsHttpError hides the response body; surface it.
            if (res.error.context && typeof res.error.context.json === "function") {
              return res.error.context.json().then(function (data) {
                throw new Error((data && data.error) || res.error.message || "Control link error");
              }, function () {
                throw new Error(res.error.message || "Control link error");
              });
            }
            throw new Error(res.error.message || "Control link error");
          }
          if (res.data && res.data.ok === false) throw new Error(res.data.error || "Control link error");
          return res.data;
        });
      },

      getCounts: function () {
        return Promise.all([
          count("clients"),
          count("tickets", function (q) { return q.neq("status", "Closed"); }),
          count("agents", function (q) { return q.eq("active", true); }),
          count("services"),
          count("addon_orders"),
          count("documents"),
          count("staging_sites"),
          count("announcements")
        ]).then(function (n) {
          return { clients: n[0], openTickets: n[1], agents: n[2], services: n[3], orders: n[4], documents: n[5], staging: n[6], announcements: n[7] };
        });
      },
      getClients: function () { return rows(sb.from("clients").select("*").order("account_number")); },
      getClient: function (id) { return one(sb.from("clients").select("*").eq("id", id).single()); },
      getServices: function (clientId) {
        var q = sb.from("services").select("*").order("id");
        if (clientId) q = q.eq("client_id", clientId);
        return rows(q);
      },
      getTickets: function (clientId) {
        var q = sb.from("tickets").select("*").order("updated_at", { ascending: false });
        if (clientId) q = q.eq("client_id", clientId);
        return rows(q);
      },
      getAgents: function () { return rows(sb.from("agents").select("*").order("name")); },
      getOrders: function (clientId) {
        var q = sb.from("addon_orders").select("*").order("requested_at", { ascending: false });
        if (clientId) q = q.eq("client_id", clientId);
        return rows(q);
      },
      getDocuments: function (clientId) {
        var q = sb.from("documents").select("id, client_id, title, kind, requires_signature, signed_at, signed_name, created_at").order("created_at", { ascending: false });
        if (clientId) q = q.eq("client_id", clientId);
        return rows(q);
      },
      getAnnouncements: function () { return rows(sb.from("announcements").select("*").order("created_at", { ascending: false })); },
      getStaging: function (clientId) {
        var q = sb.from("staging_sites").select("*").order("last_deploy", { ascending: false });
        if (clientId) q = q.eq("client_id", clientId);
        return rows(q);
      },
      getActivity: function (limit) {
        return rows(sb.from("activity").select("*").order("ts", { ascending: false }).limit(limit || 100));
      },

      updateClient: function (id, patch) {
        return one(sb.from("clients").update(patch).eq("id", id).select().single());
      },
      updateTicket: function (id, patch) {
        patch = Object.assign({}, patch, { updated_at: new Date().toISOString() });
        return one(sb.from("tickets").update(patch).eq("id", id).select().single());
      },
      saveAgent: function (agent) {
        if (agent.id) {
          var id = agent.id;
          var patch = Object.assign({}, agent);
          delete patch.id;
          return one(sb.from("agents").update(patch).eq("id", id).select().single());
        }
        return one(sb.from("agents").insert(agent).select().single());
      },
      updateOrder: function (id, patch) {
        return one(sb.from("addon_orders").update(patch).eq("id", id).select().single());
      },
      saveAnnouncement: function (ann) {
        if (ann.id) {
          var aid = ann.id;
          var ap = Object.assign({}, ann);
          delete ap.id;
          return one(sb.from("announcements").update(ap).eq("id", aid).select().single());
        }
        return one(sb.from("announcements").insert(ann).select().single());
      },
      deleteAnnouncement: function (id) {
        return sb.from("announcements").delete().eq("id", id).then(function (res) {
          if (res.error) throw new Error(res.error.message);
          return true;
        });
      },
      logActivity: function (kind, ref, detail) {
        return sb.from("activity").insert({
          agent: "Master (master@velocube.net)", kind: kind, ref: ref, detail: detail
        }).then(function () { return true; }, function () { return false; });
      }
    };
  }

  return hasSupabase ? makeSupabaseAdapter() : makeSandboxAdapter();
})();
